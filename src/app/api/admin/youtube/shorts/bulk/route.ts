export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { YouTubeVideo } from "@/models/YouTubeVideo";

async function verifyAdminAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return false;
  }
  return session;
}

export async function POST(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const { ids, action, category } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "No video IDs provided" }, { status: 400 });
    }

    if (!action || !["approve", "reject", "delete", "change_category"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action specified" }, { status: 400 });
    }

    let modifiedCount = 0;

    if (action === "approve") {
      const res = await YouTubeVideo.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "approved" } }
      );
      modifiedCount = res.modifiedCount;
    } else if (action === "reject") {
      const res = await YouTubeVideo.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "rejected" } }
      );
      modifiedCount = res.modifiedCount;
    } else if (action === "delete") {
      const res = await YouTubeVideo.deleteMany({ _id: { $in: ids } });
      modifiedCount = res.deletedCount;
    } else if (action === "change_category") {
      if (!category) {
        return NextResponse.json({ success: false, error: "Category is required for change_category action" }, { status: 400 });
      }
      const res = await YouTubeVideo.updateMany(
        { _id: { $in: ids } },
        { $set: { category } }
      );
      modifiedCount = res.modifiedCount;
    }

    return NextResponse.json({
      success: true,
      message: `Bulk action '${action}' applied to ${modifiedCount} item(s)!`,
      modifiedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
