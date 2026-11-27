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
  individualCronBatchSize: {
    value: 5,
    description: "Max number of individual books processed per cron execution (scraping stop limit)",
  },
  individualCronMinDelaySeconds: {
    value: 30,
    description: "Minimum random delay in seconds between scraping individual books (anti-bot protection)",
  },
  individualCronMaxDelaySeconds: {
    value: 150,
    description: "Maximum random delay in seconds between scraping individual books (anti-bot protection)",
  },
  multibookAiScraper: {
    value: "deepseek",
    description: "Scraper engine used by Multi-Book automated cron",
  },
  multibookCronBatchSize: {
    value: 5,
    description: "Max number of multi-book summaries processed per cron execution (scraping stop limit)",
  },
  multibookCronMinDelaySeconds: {
    value: 30,
    description: "Minimum random delay in seconds between scraping multi-book syntheses (anti-bot protection)",
  },
  multibookCronMaxDelaySeconds: {
    value: 150,
    description: "Maximum random delay in seconds between scraping multi-book syntheses (anti-bot protection)",
  },
  geminiConcurrencyLimit: {
    value: 2,
    description: "Number of concurrent Gemini API requests per batch",
  },
  geminiTotalBooksLimit: {
    value: 10,
    description: "Max total books/summaries processed per Gemini cron run",
  },
  geminiAccounts: {
    value: [
      { id: "acc-1", label: "Account 1", apiKey: "", model: "gemini-2.5-flash", isActive: true },
      { id: "acc-2", label: "Account 2", apiKey: "", model: "gemini-2.5-flash", isActive: true },
    ],
    description: "List of Gemini API accounts (rotated round-robin)",
  },
  audioVoice: {
    value: "en-US-ChristopherNeural",
    description: "Default Microsoft Edge Neural TTS voice for book audio generation",
  },
  showAudio: {
    value: true,
    description: "Global toggle to show or hide audio across the app",
  },
  audioRate: {
    value: "-4%",
    description: "Speech rate adjustment for Edge TTS (e.g. -4%, 0%, +5%)",
  },
  audioPitch: {
    value: "-2Hz",
    description: "Pitch adjustment for Edge TTS (e.g. -2Hz, 0Hz)",
  },
  audioConcurrency: {
    value: 3,
    description: "Number of concurrent books to generate audio for in parallel (1-5 recommended)",
  },
  audioBatchSize: {
    value: 10,
    description: "Max number of books processed per Audio Cron execution",
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
