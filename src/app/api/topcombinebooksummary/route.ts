import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { apiCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const topic = searchParams.get("topic") || searchParams.get("category");
    const search = searchParams.get("search");
    const isTopCombine = searchParams.get("isTopCombine");
    const bypassCache = searchParams.get("nocache") === "true";

    // Generate unique cache key based on query parameters
    const cacheKey = `topcombinebooksummary:${topic || ""}:${search || ""}:${isTopCombine || ""}`;

    if (!bypassCache) {
      const cachedData = apiCache.get(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData, {
          headers: {
            "X-Cache": "HIT",
          },
        });
      }
    }

    await connectDB();

    const query: any = {};

    if (topic) {
      query.topic = { $regex: topic, $options: "i" };
    }

    if (isTopCombine === "true") {
      query.isTopCombine = true;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { topic: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const collection = db.collection("topcombinebooksummary");
    const summaries = await collection.find(query).sort({ createdAt: -1 }).toArray();

    const responseData = {
      success: true,
      count: summaries.length,
      data: summaries,
      cachedAt: new Date().toISOString(),
    };

    // Cache the response for 5 minutes (300 seconds)
    apiCache.set(cacheKey, responseData, 300);

    return NextResponse.json(responseData, {
      headers: {
        "X-Cache": "MISS",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch top combine book summaries",
      },
      { status: 500 }
    );
  }
}

