export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AdminSetting } from "@/models/AdminSetting";

async function verifyAdminAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return false;
  }
  return session;
}

const DEFAULT_SETTINGS: Record<string, { value: any; description: string }> = {
  defaultAiScraper: {
    value: "deepseek",
    description: "Default AI scraper engine for automated cron content generation (deepseek | chatgpt)",
  },
  individualAiScraper: {
    value: "deepseek",
    description: "Scraper engine used by Individual Books automated cron",
  },
  multibookAiScraper: {
    value: "deepseek",
    description: "Scraper engine used by Multi-Book automated cron",
  },
};

export async function GET() {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const settingsDocs = await AdminSetting.find();
    const settingsMap: Record<string, any> = {};

    // Fill defaults first
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      settingsMap[k] = v.value;
    }

    // Override with DB values
    for (const doc of settingsDocs) {
      settingsMap[doc.key] = doc.value;
    }

    return NextResponse.json({
      success: true,
      settings: settingsMap,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await AdminSetting.findOneAndUpdate(
        { key },
        {
          key,
          value,
          description: DEFAULT_SETTINGS[key]?.description || "",
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
