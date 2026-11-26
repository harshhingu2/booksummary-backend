export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { ChildProcess } from "child_process";

const LOCK_KEY = "__individualCronLock";

export async function POST() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const g = globalThis as Record<string, any>;
  const lock = g[LOCK_KEY] as
    | { running: boolean; startedAt: number; aborted: boolean; childProcess: ChildProcess | null }
    | undefined;

  if (!lock?.running) {
    return NextResponse.json({
      success: true,
      killed: false,
      message: "No active scraper process is currently running.",
    });
  }

  lock.aborted = true;
  let killedPid: number | undefined;
  if (lock.childProcess && !lock.childProcess.killed) {
    killedPid = lock.childProcess.pid;
    lock.childProcess.kill("SIGKILL");
  }
  lock.running = false;
  lock.childProcess = null;

  return NextResponse.json({
    success: true,
    killed: true,
    message: killedPid
      ? `Killed active scraper process (PID ${killedPid}) and released cron lock.`
      : "Aborted running cron batch and released lock.",
  });
}
