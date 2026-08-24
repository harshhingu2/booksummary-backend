export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { YouTubeChannel } from "@/models/YouTubeChannel";
import { resolveYouTubeChannel } from "@/services/youtube-feed";

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

    // Check if channels count is 0 and seed default initial channels if empty
    let channels = await YouTubeChannel.find().sort({ createdAt: -1 });

    return NextResponse.json({ success: true, channels, count: channels.length });
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
    const { channelUrl, category = "Random" } = body;

    if (!channelUrl) {
      return NextResponse.json({ success: false, error: "Channel URL is required" }, { status: 400 });
    }

    const resolved = await resolveYouTubeChannel(channelUrl);

    const existing = await YouTubeChannel.findOne({ channelId: resolved.channelId });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Channel '${existing.channelName}' already exists!` },
        { status: 400 }
      );
    }

    const newChannel = await YouTubeChannel.create({
      channelId: resolved.channelId,
      channelName: resolved.channelName,
      channelUrl,
      feedUrl: resolved.feedUrl,
      defaultCategory: category,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: `Channel '${resolved.channelName}' added successfully!`,
      channel: newChannel,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
