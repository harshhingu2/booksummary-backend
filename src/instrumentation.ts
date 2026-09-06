export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reloadCronSchedules } = await import("@/lib/cron");
    console.log("[Instrumentation] Next.js server started. Initializing Cron Scheduler...");
    try {
      await reloadCronSchedules();
      console.log("[Instrumentation] Cron Scheduler successfully initialized.");
    } catch (err) {
      console.error("[Instrumentation] Error initializing Cron Scheduler:", err);
    }
  }
}
