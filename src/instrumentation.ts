export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Instrumentation] Next.js server started. Initializing DB migrations & Cron Scheduler...");
    try {
      const { connectDB } = await import("@/lib/db");
      await connectDB();
      console.log("[Instrumentation] DB connected and initial data/migrations verified.");
    } catch (dbErr) {
      console.error("[Instrumentation] Error initializing DB in instrumentation:", dbErr);
    }

    try {
      const { reloadCronSchedules } = await import("@/lib/cron");
      await reloadCronSchedules();
      console.log("[Instrumentation] Cron Scheduler successfully initialized.");
    } catch (err) {
      console.error("[Instrumentation] Error initializing Cron Scheduler:", err);
    }
  }
}
