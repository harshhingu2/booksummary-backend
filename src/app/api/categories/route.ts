import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";

export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    return NextResponse.json({
      success: true,
      categories: categories.map((c) => ({
        id: c._id,
        name: c.name,
        slug: c.slug,
        description: c.description,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
