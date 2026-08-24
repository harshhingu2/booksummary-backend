import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { YouTubeVideo } from "@/models/YouTubeVideo";
import { apiCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const cacheKey = `feed_cat_${category}_p_${page}_l_${limit}`;
    const cachedData = apiCache.get(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: { "X-Cache-Status": "HIT" },
      });
    }

    await connectDB();

    const query: any = {
      isShort: true,
      status: "approved",
    };

    if (category && category.toLowerCase() !== "all") {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }

    const total = await YouTubeVideo.countDocuments(query);
    const shorts = await YouTubeVideo.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("videoId title channelName thumbnailUrl publishedAt category source");

    const responsePayload = {
      success: true,
      page,
      limit,
      total,
      hasMore: skip + shorts.length < total,
      data: shorts.map((item) => ({
        videoId: item.videoId,
        title: item.title,
        channelName: item.channelName,
        thumbnailUrl: item.thumbnailUrl,
        category: item.category,
        source: item.source || "youtube",
        publishedAt: item.publishedAt,
      })),
    };

    // Cache for 60 seconds
    apiCache.set(cacheKey, responsePayload, 60);

    return NextResponse.json(responsePayload, {
      headers: { "X-Cache-Status": "MISS" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
