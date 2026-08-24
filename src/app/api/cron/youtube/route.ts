import { NextRequest, NextResponse } from "next/server";
import { runYouTubeIngestion } from "@/services/youtube-ingestion";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dumbscroll_cron_secret_2026_v1";

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      // Also allow cron query param for flexibility: /api/cron/youtube?secret=...
      const secretParam = request.nextUrl.searchParams.get("secret");
      if (secretParam !== cronSecret) {
        return NextResponse.json({ success: false, error: "Unauthorized cron execution" }, { status: 401 });
      }
    }

    const stats = await runYouTubeIngestion();

    return NextResponse.json({
      success: true,
      message: "YouTube Shorts ingestion cron completed successfully",
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
