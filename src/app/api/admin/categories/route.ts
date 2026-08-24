export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";

async function verifyAdminAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return false;
  }
  return session;
}

export async function GET(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const categories = await Category.find(query).sort({ sortOrder: 1, name: 1 });

    return NextResponse.json({
      success: true,
      categories,
      count: categories.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const { name, description = "", isActive = true, sortOrder = 0 } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const existing = await Category.findOne({ $or: [{ name: name.trim() }, { slug }] });
    if (existing) {
      return NextResponse.json({ success: false, error: `Category '${name}' already exists!` }, { status: 400 });
    }

    const newCategory = await Category.create({
      name: name.trim(),
      slug,
      description: description.trim(),
      isActive,
      sortOrder: Number(sortOrder) || 0,
    });

    return NextResponse.json({
      success: true,
      message: `Category '${newCategory.name}' created successfully!`,
      category: newCategory,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
