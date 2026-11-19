/**
 * Estimation calculation utility for emptying the AI Scraping / Content Queue.
 *
 * Uses:
 * - Queue Count: number of items waiting with needsContentGeneration = true (or custom selected count)
 * - Batch Size / Stop Limit: X items processed per cron run
 * - Cron Schedule expression: e.g. "every 15 mins", "every 1 hour", etc.
 * - Anti-bot randomized scrape delay: average ~1.5 mins + scraper run time (~1.5 mins)
 */

export interface QueueEstimation {
  queueCount: number;
  batchLimit: number;
  cronSchedule: string;
  isCronActive: boolean;
  cronRunsPerDay: number;
  cronIntervalDescription: string;
  itemsPerDay: number;
  totalCronRunsNeeded: number;
  approxDays: number;
  approxHours: number;
  durationText: string; // The pure duration required (e.g. "~2 days, 4 hrs" or "~5 hours") regardless of active/paused state
  estimatedCompletionText: string;
  perRunDurationApproxMinutes: number;
}

export function parseCronRunsPerDay(schedule: string): { runsPerDay: number; description: string } {
  const s = schedule ? schedule.trim() : "*/15 * * * *";

  // Check common patterns
  if (s === "* * * * *") {
    return { runsPerDay: 1440, description: "Every 1 minute (1,440 runs/day)" };
  }
  if (s === "*/5 * * * *") {
    return { runsPerDay: 288, description: "Every 5 minutes (288 runs/day)" };
  }
  if (s === "*/10 * * * *") {
    return { runsPerDay: 144, description: "Every 10 minutes (144 runs/day)" };
  }
  if (s === "*/15 * * * *") {
    return { runsPerDay: 96, description: "Every 15 minutes (96 runs/day)" };
  }
  if (s === "*/30 * * * *") {
    return { runsPerDay: 48, description: "Every 30 minutes (48 runs/day)" };
  }
  if (s === "0 * * * *" || s === "* */1 * * *") {
    return { runsPerDay: 24, description: "Every 1 hour (24 runs/day)" };
  }
  if (s === "0 */2 * * *") {
    return { runsPerDay: 12, description: "Every 2 hours (12 runs/day)" };
  }
  if (s === "0 */3 * * *") {
    return { runsPerDay: 8, description: "Every 3 hours (8 runs/day)" };
  }
  if (s === "0 */4 * * *") {
    return { runsPerDay: 6, description: "Every 4 hours (6 runs/day)" };
  }
  if (s === "0 */6 * * *") {
    return { runsPerDay: 4, description: "Every 6 hours (4 runs/day)" };
  }
  if (s === "0 */12 * * *") {
    return { runsPerDay: 2, description: "Every 12 hours (2 runs/day)" };
  }
  if (s === "0 0 * * *") {
    return { runsPerDay: 1, description: "Once every 24 hours (1 run/day)" };
  }
  if (s === "0 0 * * 0") {
    return { runsPerDay: 1 / 7, description: "Once a week (0.14 runs/day)" };
  }

  // Parse "*/N * * * *" pattern
  const stepMatch = s.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (stepMatch) {
    const mins = parseInt(stepMatch[1], 10);
    if (mins > 0 && mins <= 1440) {
      const runs = Math.round((1440 / mins) * 100) / 100;
      return { runsPerDay: runs, description: `Every ${mins} minutes (~${runs} runs/day)` };
    }
  }

  // Parse "0 */N * * *" pattern
  const hourStepMatch = s.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
  if (hourStepMatch) {
    const hours = parseInt(hourStepMatch[1], 10);
    if (hours > 0 && hours <= 24) {
      const runs = Math.round((24 / hours) * 100) / 100;
      return { runsPerDay: runs, description: `Every ${hours} hours (~${runs} runs/day)` };
    }
  }

  // Fallback default (every 15 min)
  return { runsPerDay: 96, description: `${s} (~96 runs/day)` };
}

export function formatDurationEstimate(approxDaysRaw: number, approxHoursRaw: number): string {
  if (approxDaysRaw <= 0 && approxHoursRaw <= 0) {
    return "0 mins";
  }
  if (approxDaysRaw >= 1) {
    const d = Math.floor(approxDaysRaw);
    const remainingH = Math.round((approxDaysRaw - d) * 24);
    return remainingH > 0 ? `~${d} day${d > 1 ? "s" : ""}, ${remainingH} hr${remainingH > 1 ? "s" : ""}` : `~${d} day${d > 1 ? "s" : ""}`;
  }
  if (approxHoursRaw >= 1) {
    const h = Math.round(approxHoursRaw * 10) / 10;
    return `~${h} hr${h !== 1 ? "s" : ""}`;
  }
  const mins = Math.max(1, Math.round(approxHoursRaw * 60));
  return `~${mins} min${mins !== 1 ? "s" : ""}`;
}

export function calculateQueueEstimate(
  queueCount: number,
  batchLimit: number,
  cronSchedule: string,
  isCronActive: boolean = true
): QueueEstimation {
  const safeCount = Math.max(0, queueCount || 0);
  const safeBatch = Math.max(1, batchLimit || 1);
  const { runsPerDay, description } = parseCronRunsPerDay(cronSchedule);

  if (safeCount === 0) {
    return {
      queueCount: 0,
      batchLimit: safeBatch,
      cronSchedule,
      isCronActive,
      cronRunsPerDay: runsPerDay,
      cronIntervalDescription: description,
      itemsPerDay: 0,
      totalCronRunsNeeded: 0,
      approxDays: 0,
      approxHours: 0,
      durationText: "0 mins",
      estimatedCompletionText: "Queue is empty! 0 books remaining.",
      perRunDurationApproxMinutes: 0,
    };
  }

  // Runs needed to process safeCount items taking safeBatch each run
  const totalCronRunsNeeded = Math.ceil(safeCount / safeBatch);

  // Items processed per day = batchLimit * runsPerDay
  const itemsPerDay = Math.round(safeBatch * runsPerDay * 10) / 10;

  // Approx days to finish based on schedule = safeCount / itemsPerDay
  const approxDaysRaw = itemsPerDay > 0 ? safeCount / itemsPerDay : 0;
  const approxHoursRaw = approxDaysRaw * 24;

  // Average time per run: each item takes ~1.5 min scrape + 1.5 min random delay = ~3 min
  const perRunDurationApproxMinutes = Math.round(safeBatch * 2.5 * 10) / 10;

  // Pure duration calculation regardless of paused state
  const durationText = formatDurationEstimate(approxDaysRaw, approxHoursRaw);

  const estimatedCompletionText = !isCronActive
    ? `${durationText} (when active)`
    : durationText;

  return {
    queueCount: safeCount,
    batchLimit: safeBatch,
    cronSchedule,
    isCronActive,
    cronRunsPerDay: runsPerDay,
    cronIntervalDescription: description,
    itemsPerDay,
    totalCronRunsNeeded,
    approxDays: Math.round(approxDaysRaw * 100) / 100,
    approxHours: Math.round(approxHoursRaw * 10) / 10,
    durationText,
    estimatedCompletionText,
    perRunDurationApproxMinutes,
  };
}
