export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { YouTubeVideo } from "@/models/YouTubeVideo";

async function verifyAdminAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return false;
  }
  return session;
}

export async function GET(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";

    const query: any = { isShort: true };
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { channelName: { $regex: search, $options: "i" } },
      ];
    }

    const shorts = await YouTubeVideo.find(query).sort({ publishedAt: -1 });

    const counts = {
      pending: await YouTubeVideo.countDocuments({ isShort: true, status: "pending" }),
      approved: await YouTubeVideo.countDocuments({ isShort: true, status: "approved" }),
      rejected: await YouTubeVideo.countDocuments({ isShort: true, status: "rejected" }),
    };

    return NextResponse.json({
      success: true,
      shorts,
      counts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function extractVideoId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/(?:shorts\/|v=|v\/|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return trimmed;
}

export async function POST(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const { urlOrId, category, status } = body;
    let { title, channelName } = body;

    if (!urlOrId || !category) {
      return NextResponse.json(
        { success: false, error: "YouTube Short URL/ID and Category are required" },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(urlOrId);
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: "Could not extract a valid YouTube video ID" },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await YouTubeVideo.findOne({ videoId });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Short video '${videoId}' already exists in database` },
        { status: 400 }
      );
    }

    // Fetch oEmbed metadata if title or channelName is missing
    if (!title || !channelName) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );
        if (oembedRes.ok) {
          const meta = await oembedRes.json();
          if (!title && meta.title) title = meta.title;
          if (!channelName && meta.author_name) channelName = meta.author_name;
        }
      } catch (e) {
        console.warn("oEmbed fetch failed for videoId:", videoId, e);
      }
    }

    const newVideo = await YouTubeVideo.create({
      videoId,
      channelId: "manual",
      channelName: channelName || "Manual Upload",
      title: title || `Short ${videoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt: new Date(),
      category: category,
      source: "manual",
      isShort: true,
      status: status || "approved",
    });

    return NextResponse.json({
      success: true,
      message: "Short video added successfully!",
      video: newVideo,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
