import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { BookSummary } from "@/models/Book";
import { IndividualBook } from "@/models/IndividualBook";
import { Category } from "@/models/Category";
import { DUMMY_TOPIC_SUMMARIES, DUMMY_INDIVIDUAL_BOOKS } from "@/lib/dummyBooks";

export async function GET() {
  try {
    await connectDB();
    
    // 1. Seed Categories with type taxonomy
    const defaultCategories = [
      { name: "Productivity", type: "all", sortOrder: 1, description: "Deep work, flow, and output optimization" },
      { name: "Mindset", type: "all", sortOrder: 2, description: "Mental resilience and mental models" },
      { name: "Money", type: "all", sortOrder: 3, description: "Personal finance, investing, and wealth compounding" },
      { name: "Psychology", type: "all", sortOrder: 4, description: "Human behavior, cognitive biases, and decision making" },
      { name: "Leadership", type: "topcombine", sortOrder: 5, description: "Executive synthesis and high-leverage management" },
      { name: "Philosophy", type: "individual", sortOrder: 6, description: "Stoicism, existential thoughts, and wisdom" },
      { name: "Business", type: "topcombine", sortOrder: 7, description: "Startup dynamics, strategy, and moats" },
      { name: "Biography", type: "individual", sortOrder: 8, description: "Life stories of exceptional leaders and thinkers" },
      { name: "Science", type: "individual", sortOrder: 9, description: "Physics, biology, and scientific inquiry" },
    ];

    for (const cat of defaultCategories) {
      const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await Category.findOneAndUpdate(
        { slug },
        { ...cat, slug, isActive: true },
        { upsert: true, new: true }
      );
    }

    // 2. Seed topcombine summaries
    let insertedSummaries: any[] = [];
    const topCount = await BookSummary.countDocuments();
    if (topCount === 0) {
      insertedSummaries = await BookSummary.insertMany(DUMMY_TOPIC_SUMMARIES);
    }

    // 3. Seed individual books
    let insertedIndividual: any[] = [];
    const individualCount = await IndividualBook.countDocuments();
    if (individualCount === 0) {
      insertedIndividual = await IndividualBook.insertMany(DUMMY_INDIVIDUAL_BOOKS);
    } else {
      const existingTitles = await IndividualBook.find().distinct("title");
      const toInsert = DUMMY_INDIVIDUAL_BOOKS.filter(b => !existingTitles.includes(b.title));
      if (toInsert.length > 0) {
        insertedIndividual = await IndividualBook.insertMany(toInsert);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Seeding completed successfully with category types!",
      topCombineCount: await BookSummary.countDocuments(),
      individualBooksCount: await IndividualBook.countDocuments(),
      categoriesCount: await Category.countDocuments(),
      newIndividualInserted: insertedIndividual.length,
      newTopCombineInserted: insertedSummaries.length,
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
