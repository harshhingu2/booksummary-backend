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
 * Executes a cron job target (either internal service or HTTP fetch).
 */
export async function executeCronJob(job: ICronJob) {
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
  await connectDB();

  // Stop & clear existing scheduled tasks
  for (const [id, task] of globalForCron.activeCronTasks!.entries()) {
    task.stop();
  }
  globalForCron.activeCronTasks!.clear();

  // Load active jobs from DB
  const jobs = await CronJob.find({ isActive: true });

  for (const job of jobs) {
    if (cron.validate(job.schedule)) {
      const task = cron.schedule(job.schedule, async () => {
        console.log(`[node-cron] Triggering scheduled job '${job.name}' (${job.schedule})...`);
        await executeCronJob(job);
      });
      globalForCron.activeCronTasks!.set(job._id.toString(), task);
      console.log(`[node-cron] Scheduled '${job.name}' with pattern '${job.schedule}'`);
    } else {
      console.error(`[node-cron] Invalid cron expression '${job.schedule}' for job '${job.name}'`);
    }
  }
}

/**
 * Initializes the cron scheduler manager on server startup.
 */
export async function initYouTubeCron() {
  if (globalForCron.isCronManagerInitialized) {
    return;
  }
  globalForCron.isCronManagerInitialized = true;

  try {
    await connectDB();

    // Ensure default YouTube Ingestion Cron Job exists in DB
    const existingYouTubeJob = await CronJob.findOne({ name: "YouTube Shorts Auto Ingestion" });
    if (!existingYouTubeJob) {
      await CronJob.create({
        name: "YouTube Shorts Auto Ingestion",
        schedule: "*/15 * * * *",
        endpoint: "/api/cron/youtube",
        isActive: true,
        lastStatus: "never",
      });
      console.log("[node-cron] Created default YouTube Shorts Auto Ingestion cron job in DB.");
    }

    await reloadCronSchedules();
  } catch (err) {
    console.error("[node-cron] Failed to initialize cron manager:", err);
  }
}
