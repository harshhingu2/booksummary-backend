import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { BookSummary } from "@/models/Book";
import { DUMMY_TOPIC_SUMMARIES } from "@/lib/dummyBooks";

export async function GET() {
  try {
    await connectDB();
    
    // Seed topic-based dummy summaries into topcombinebooksummary collection
    const insertedSummaries = await BookSummary.insertMany(DUMMY_TOPIC_SUMMARIES);

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${insertedSummaries.length} topic-based summaries into MongoDB!`,
      count: insertedSummaries.length,
      data: insertedSummaries,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to seed database",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
