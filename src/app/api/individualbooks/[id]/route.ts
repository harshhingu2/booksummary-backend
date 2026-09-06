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

    const collection = db.collection("individualbooks");
    let book = null;

    if (ObjectId.isValid(id)) {
      book = await collection.findOne({ _id: new ObjectId(id) });
    }

    if (!book) {
      return NextResponse.json(
        { success: false, error: "Individual book summary not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: book,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch book summary",
      },
      { status: 500 }
    );
  }
}
