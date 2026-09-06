import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "topcombine", "individual", or undefined for all

    const query: any = { isActive: true };
    if (type) {
      // Return categories specifically matching the requested type, or general categories marked 'all'
      query.$or = [{ type }, { type: "all" }, { type: { $exists: false } }];
    }

    const categories = await Category.find(query).sort({ sortOrder: 1, name: 1 });
    return NextResponse.json({
      success: true,
      categories: categories.map((c) => ({
        id: c._id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        type: c.type || "all",
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
