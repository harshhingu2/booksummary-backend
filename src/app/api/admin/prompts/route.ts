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

// GET /api/admin/prompts?type=individual|multibook
export async function GET(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const query: Record<string, any> = {};
    if (type && ["individual", "multibook"].includes(type)) {
      query.type = type;
    }

    const prompts = await Prompt.find(query).sort({ isDefault: -1, updatedAt: -1 });

    return NextResponse.json({
      success: true,
      prompts,
      count: prompts.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/prompts
export async function POST(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const { name, type, content, description = "", isActive = true, isDefault = false } = body;

    if (!name || !type || !content) {
      return NextResponse.json(
        { success: false, error: "Name, type ('individual' | 'multibook'), and content are required" },
        { status: 400 }
      );
    }

    if (!["individual", "multibook"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Type must be either 'individual' or 'multibook'" },
        { status: 400 }
      );
    }

    // If marked as default, unset existing default of the same type
    if (isDefault) {
      await Prompt.updateMany({ type }, { $set: { isDefault: false } });
    }

    const newPrompt = await Prompt.create({
      name: name.trim(),
      type,
      content,
      description: description.trim(),
      isActive,
      isDefault,
    });

    return NextResponse.json({
      success: true,
      prompt: newPrompt,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
