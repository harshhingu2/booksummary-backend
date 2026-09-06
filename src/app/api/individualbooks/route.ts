import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { apiCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const topic = searchParams.get("topic") || searchParams.get("category");
    const search = searchParams.get("search");
    const isFeatured = searchParams.get("isFeatured");
    const bypassCache = searchParams.get("nocache") === "true";

    const cacheKey = "individualbooks:" + (topic || "") + ":" + (search || "") + ":" + (isFeatured || "");

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

    if (topic && topic !== "All") {
      query.topic = { $regex: topic, $options: "i" };
    }

    if (isFeatured === "true") {
      query.isFeatured = true;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { topic: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const collection = db.collection("individualbooks");
    const books = await collection.find(query).sort({ createdAt: -1 }).toArray();

    const responseData = {
      success: true,
      count: books.length,
      data: books,
      cachedAt: new Date().toISOString(),
    };

    apiCache.set(cacheKey, responseData, 300);

    return NextResponse.json(responseData, {
      headers: {
        "X-Cache": "MISS",
      },
    });
  } catch (error: any) {
    console.error("Error in /api/individualbooks GET:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch individual books",
      },
      { status: 500 }
    );
  }
}
