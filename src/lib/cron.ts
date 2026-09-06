import cron, { ScheduledTask } from "node-cron";
import { connectDB } from "@/lib/db";
import { CronJob, ICronJob } from "@/models/CronJob";
import { runYouTubeIngestion } from "@/services/youtube-ingestion";

const globalForCron = globalThis as unknown as {
  activeCronTasks?: Map<string, ScheduledTask>;
  isCronManagerInitialized?: boolean;
};

if (!globalForCron.activeCronTasks) {
  globalForCron.activeCronTasks = new Map<string, ScheduledTask>();
}

/**
 * Returns the number of currently active in-memory node-cron tasks.
 */
export function getActiveCronCount(): number {
  return globalForCron.activeCronTasks ? globalForCron.activeCronTasks.size : 0;
}

/**
 * Returns whether the cron manager has been initialized in memory.
 */
export function isCronManagerInitialized(): boolean {
  return !!globalForCron.isCronManagerInitialized;
}

/**
 * Executes a cron job target (either internal service or HTTP fetch).
 */
export async function executeCronJob(jobOrId: ICronJob | string) {
  await connectDB();
  const job = typeof jobOrId === "string" ? await CronJob.findById(jobOrId) : jobOrId;
  if (!job) {
    return { success: false, error: "Job document not found" };
  }

  job.lastStatus = "running";
  job.lastRunAt = new Date();
  await job.save();

  try {
    let resultSummary = "";
    if (job.endpoint.includes("/api/cron/youtube") || job.name.toLowerCase().includes("youtube")) {
      const stats = await runYouTubeIngestion();
      resultSummary = JSON.stringify({
        message: "YouTube Shorts Ingestion executed",
        newShortsSaved: stats.newShortsSaved,
        channelsChecked: stats.channelsChecked,
        videosDiscovered: stats.videosDiscovered,
        duplicates: stats.duplicates,
        completedAt: stats.completedAt,
      }, null, 2);
    } else {
      // HTTP call to external endpoint
      const targetUrl = job.endpoint.startsWith("http")
        ? job.endpoint
        : `http://localhost:3000${job.endpoint.startsWith("/") ? "" : "/"}${job.endpoint}`;

      const cronSecret = process.env.CRON_SECRET || "dumbscroll_cron_secret_2026_v1";
      const res = await fetch(targetUrl, {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const text = await res.text();
      resultSummary = `HTTP ${res.status}: ${text.slice(0, 500)}`;
    }

    job.lastStatus = "success";
    job.lastRunResult = resultSummary;
    job.lastRunAt = new Date();
    await job.save();
    return { success: true, resultSummary };
  } catch (err: any) {
    job.lastStatus = "failed";
    job.lastRunResult = `Execution error: ${err.message}`;
    job.lastRunAt = new Date();
    await job.save();
    return { success: false, error: err.message };
  }
}

/**
 * Reloads all active cron jobs from MongoDB and schedules node-cron tasks.
 */
export async function reloadCronSchedules() {
  try {
    await connectDB();

    // Stop & clear existing scheduled tasks
    if (globalForCron.activeCronTasks) {
      for (const [id, task] of globalForCron.activeCronTasks.entries()) {
        try {
          task.stop();
        } catch (e) {
          console.error(`[node-cron] Error stopping task ${id}:`, e);
        }
      }
      globalForCron.activeCronTasks.clear();
    } else {
      globalForCron.activeCronTasks = new Map<string, ScheduledTask>();
    }

    // Load active jobs from DB
    const jobs = await CronJob.find({ isActive: true });
    console.log(`[node-cron] Found ${jobs.length} active cron jobs in database to schedule.`);

    for (const job of jobs) {
      const jobIdStr = job._id.toString();
      const scheduleExpr = job.schedule.trim();

      if (cron.validate(scheduleExpr)) {
        const task = cron.schedule(scheduleExpr, async () => {
          console.log(`[node-cron] Triggering scheduled job '${job.name}' (${scheduleExpr})...`);
          try {
            await connectDB();
            const freshJob = await CronJob.findById(jobIdStr);
            if (!freshJob || !freshJob.isActive) {
              console.log(`[node-cron] Job '${job.name}' is inactive or deleted, skipping execution.`);
              return;
            }
            await executeCronJob(freshJob);
          } catch (err) {
            console.error(`[node-cron] Error during scheduled execution of '${job.name}':`, err);
          }
        });

        globalForCron.activeCronTasks.set(jobIdStr, task);
        console.log(`[node-cron] Successfully scheduled '${job.name}' with pattern '${scheduleExpr}'`);
      } else {
        console.error(`[node-cron] Invalid cron expression '${scheduleExpr}' for job '${job.name}'`);
      }
    }

    globalForCron.isCronManagerInitialized = true;
  } catch (err) {
    console.error("[node-cron] Failed to reload cron schedules:", err);
  }
}
