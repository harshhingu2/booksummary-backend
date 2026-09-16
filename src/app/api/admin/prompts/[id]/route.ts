export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Prompt } from "@/models/Prompt";

async function verifyAdminAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return false;
  }
  return session;
}

// GET /api/admin/prompts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const { id } = await params;
    const prompt = await Prompt.findById(id);

    if (!prompt) {
      return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, prompt });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/prompts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { name, type, content, description, isActive, isDefault } = body;

    const existingPrompt = await Prompt.findById(id);
    if (!existingPrompt) {
      return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
    }

    const targetType = type || existingPrompt.type;

    if (isDefault) {
      await Prompt.updateMany({ type: targetType, _id: { $ne: id } }, { $set: { isDefault: false } });
    }

    const updatedPrompt = await Prompt.findByIdAndUpdate(
      id,
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(content !== undefined && { content }),
        ...(description !== undefined && { description: description.trim() }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, prompt: updatedPrompt });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/prompts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const { id } = await params;
    const deletedPrompt = await Prompt.findByIdAndDelete(id);

    if (!deletedPrompt) {
      return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Prompt deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
