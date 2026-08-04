import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const collection = db.collection("topcombinebooksummary");
    const summary = await collection.findOne({ _id: new ObjectId(id) });

    if (!summary) {
      return NextResponse.json(
        { success: false, error: "Summary not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch summary",
      },
      { status: 500 }
    );
  }
}
