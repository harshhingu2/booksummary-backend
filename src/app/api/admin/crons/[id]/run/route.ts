export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { CronJob } from "@/models/CronJob";
import { executeCronJob } from "@/lib/cron";

async function verifyAdminAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return false;
  }
  return session;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();

    const job = await CronJob.findById(id);
    if (!job) {
      return NextResponse.json({ success: false, error: "Cron job not found" }, { status: 404 });
    }

    const res = await executeCronJob(job);

    return NextResponse.json({
      success: res.success,
      message: res.success
        ? `Cron job '${job.name}' executed successfully!`
        : `Cron job execution failed: ${res.error}`,
      cron: job,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
