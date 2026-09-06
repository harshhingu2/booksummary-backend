/**
 * Standalone Background Cron Runner Script
 * 
 * Usage:
 *   node scripts/cronRunner.mjs
 *   or via PM2:
 *   pm2 start scripts/cronRunner.mjs --name "dumbscroll-cron-runner"
 */

import mongoose from 'mongoose';
import cron from 'node-cron';
import fs from 'fs';
import { runYouTubeIngestion } from '../src/services/youtube-ingestion.ts';

try {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  } else if (fs.existsSync('.env')) {
    process.loadEnvFile('.env');
  }
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[Cron Runner] ERROR: MONGODB_URI environment variable is missing.');
  process.exit(1);
}

const CronJobSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    schedule: { type: String, required: true },
    endpoint: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    lastStatus: { type: String, default: 'never' },
    lastRunResult: { type: String, default: '' },
  },
  { timestamps: true, collection: 'cron_jobs' }
);

const CronJob = mongoose.models.CronJob || mongoose.model('CronJob', CronJobSchema, 'cron_jobs');

const activeTasks = new Map();

async function executeJob(jobId) {
  try {
    const job = await CronJob.findById(jobId);
    if (!job || !job.isActive) {
      console.log(`[Cron Runner] Job ${jobId} not found or inactive, skipping.`);
      return;
    }

    console.log(`[Cron Runner] [${new Date().toISOString()}] Executing job: '${job.name}'`);
    job.lastStatus = 'running';
    job.lastRunAt = new Date();
    await job.save();

    let resultSummary = '';
    if (job.endpoint.includes('/api/cron/youtube') || job.name.toLowerCase().includes('youtube')) {
      const stats = await runYouTubeIngestion();
      resultSummary = JSON.stringify(
        {
          message: 'YouTube Shorts Ingestion executed',
          newShortsSaved: stats.newShortsSaved,
          channelsChecked: stats.channelsChecked,
          videosDiscovered: stats.videosDiscovered,
          duplicates: stats.duplicates,
          completedAt: stats.completedAt,
        },
        null,
        2
      );
    } else {
      const targetUrl = job.endpoint.startsWith('http')
        ? job.endpoint
        : `http://localhost:3000${job.endpoint.startsWith('/') ? '' : '/'}${job.endpoint}`;
      const cronSecret = process.env.CRON_SECRET || 'dumbscroll_cron_secret_2026_v1';
      const res = await fetch(targetUrl, {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const text = await res.text();
      resultSummary = `HTTP ${res.status}: ${text.slice(0, 500)}`;
    }

    job.lastStatus = 'success';
    job.lastRunResult = resultSummary;
    job.lastRunAt = new Date();
    await job.save();
    console.log(`[Cron Runner] Successfully finished job: '${job.name}'`);
  } catch (err) {
    console.error(`[Cron Runner] Execution failed for job ${jobId}:`, err);
    try {
      await CronJob.findByIdAndUpdate(jobId, {
        lastStatus: 'failed',
        lastRunResult: `Execution error: ${err.message}`,
        lastRunAt: new Date(),
      });
    } catch (dbErr) {
      console.error('[Cron Runner] Failed to write error status to DB:', dbErr);
    }
  }
}

async function syncSchedules() {
  try {
    const jobs = await CronJob.find({ isActive: true });
    const currentJobIds = new Set(jobs.map((j) => j._id.toString()));

    // Cancel removed or disabled jobs
    for (const [id, task] of activeTasks.entries()) {
      if (!currentJobIds.has(id)) {
        task.stop();
        activeTasks.delete(id);
        console.log(`[Cron Runner] Removed schedule for job ${id}`);
      }
    }

    // Schedule active jobs
    for (const job of jobs) {
      const jobId = job._id.toString();
      if (!activeTasks.has(jobId)) {
        if (cron.validate(job.schedule)) {
          const task = cron.schedule(job.schedule, () => executeJob(jobId));
          activeTasks.set(jobId, task);
          console.log(`[Cron Runner] Scheduled '${job.name}' with cron pattern '${job.schedule}'`);
        } else {
          console.error(`[Cron Runner] Invalid cron expression '${job.schedule}' for job '${job.name}'`);
        }
      }
    }
  } catch (err) {
    console.error('[Cron Runner] Error syncing schedules from database:', err);
  }
}

async function start() {
  console.log('[Cron Runner] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('[Cron Runner] Connected to MongoDB. Initializing schedules...');

  await syncSchedules();

  // Re-sync schedules every 2 minutes in case jobs are added/modified via Admin UI
  setInterval(syncSchedules, 2 * 60 * 1000);

  console.log('[Cron Runner] Runner daemon is active and listening for scheduled triggers.');
}

start().catch((err) => {
  console.error('[Cron Runner] Fatal startup error:', err);
  process.exit(1);
});
