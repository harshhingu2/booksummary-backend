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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();
    const body = await request.json();

    const updateData: any = {};
    if (body.name) {
      updateData.name = body.name.trim();
      updateData.slug = body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder) || 0;

    const updated = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      category: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
