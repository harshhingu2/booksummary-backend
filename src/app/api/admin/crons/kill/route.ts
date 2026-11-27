export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { killCronLock } from "@/lib/cronLock";

export async function POST() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const ind = killCronLock("__individualCronLock");
  const multi = killCronLock("__multibookCronLock");

  if (!ind.killed && !multi.killed) {
    return NextResponse.json({
      success: true,
      killed: false,
      message: "No active scraper process is currently running.",
    });
  }

  const pids = [ind.pid, multi.pid].filter(Boolean);
  return NextResponse.json({
    success: true,
    killed: true,
    message: pids.length
      ? `Terminated active scraper process(es) (PID ${pids.join(", ")}) and released cron lock.`
      : "Aborted running cron batch and released lock.",
  });
}
