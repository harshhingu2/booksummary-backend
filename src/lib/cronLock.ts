import { execFile, ChildProcess } from "child_process";

const STALE_LOCK_MS = 45 * 60 * 1000; // 45 minutes safety timeout

export interface CronLockState {
  running: boolean;
  startedAt: number;
  aborted: boolean;
  childProcess: ChildProcess | null;
}

const getStore = () => globalThis as unknown as Record<string, CronLockState | undefined>;

export function acquireCronLock(key: string): boolean {
  const store = getStore();
  const lock = store[key];
  if (lock?.running && Date.now() - lock.startedAt < STALE_LOCK_MS) {
    return false;
  }
  store[key] = { running: true, startedAt: Date.now(), aborted: false, childProcess: null };
  return true;
}

export function isCronAborted(key: string): boolean {
  return Boolean(getStore()[key]?.aborted);
}

export function releaseCronLock(key: string) {
  getStore()[key] = { running: false, startedAt: 0, aborted: false, childProcess: null };
}

export function runLockedScraper(
  lockKey: string,
  scriptPath: string,
  prompt: string
): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [scriptPath, "--headless", "--timeout", "420", prompt],
      { timeout: 450000, killSignal: "SIGTERM", maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        const lock = getStore()[lockKey];
        if (lock) lock.childProcess = null;
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout });
      }
    );
    const lock = getStore()[lockKey];
    if (lock) lock.childProcess = child;
  });
}

/**
 * Send SIGTERM first so the scraper's shutdown hook kills Chromium, then SIGKILL after 1.5s if needed.
 */
export function killCronLock(key: string): { killed: boolean; pid?: number } {
  const lock = getStore()[key];
  if (!lock?.running) {
    return { killed: false };
  }
  lock.aborted = true;
  const child = lock.childProcess;
  let pid: number | undefined;
  if (child && !child.killed) {
    pid = child.pid;
    try {
      child.kill("SIGTERM");
    } catch {}
    setTimeout(() => {
      try {
        if (!child.killed) child.kill("SIGKILL");
      } catch {}
    }, 1500);
  }
  lock.running = false;
  lock.childProcess = null;
  return { killed: true, pid };
}
