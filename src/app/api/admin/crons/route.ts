export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { CronJob } from "@/models/CronJob";
import { reloadCronSchedules } from "@/lib/cron";
import cron from "node-cron";

async function verifyAdminAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return false;
  }
  return session;
}

export async function GET() {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const crons = await CronJob.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, crons, count: crons.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const { name, schedule = "*/15 * * * *", endpoint = "/api/cron/youtube", isActive = true } = body;

    if (!name || !schedule || !endpoint) {
      return NextResponse.json(
        { success: false, error: "Name, schedule, and endpoint are required" },
        { status: 400 }
      );
    }

    if (!cron.validate(schedule.trim())) {
      return NextResponse.json(
        { success: false, error: `Invalid cron schedule expression '${schedule}'` },
        { status: 400 }
      );
    }

    const existing = await CronJob.findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Cron job '${name}' already exists!` },
        { status: 400 }
      );
    }

    const newJob = await CronJob.create({
      name: name.trim(),
      schedule: schedule.trim(),
      endpoint: endpoint.trim(),
      isActive,
      lastStatus: "never",
    });

    // Reload node-cron scheduler in memory
    await reloadCronSchedules();

    return NextResponse.json({
      success: true,
      message: `Cron job '${newJob.name}' created & scheduled successfully!`,
      cron: newJob,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
