import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;

    const topic = searchParams.get("topic") || searchParams.get("category");
    const search = searchParams.get("search");
    const isTopCombine = searchParams.get("isTopCombine");

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

    return NextResponse.json({
      success: true,
      count: summaries.length,
      data: summaries,
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
