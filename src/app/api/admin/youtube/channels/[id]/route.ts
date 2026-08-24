export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { YouTubeChannel } from "@/models/YouTubeChannel";

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

    const updated = await YouTubeChannel.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Channel updated successfully",
      channel: updated,
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

    const deleted = await YouTubeChannel.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Channel deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
