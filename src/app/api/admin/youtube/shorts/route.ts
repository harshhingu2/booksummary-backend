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

export async function GET(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";

    const query: any = { isShort: true };
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { channelName: { $regex: search, $options: "i" } },
      ];
    }

    const shorts = await YouTubeVideo.find(query).sort({ publishedAt: -1 });

    const counts = {
      pending: await YouTubeVideo.countDocuments({ isShort: true, status: "pending" }),
      approved: await YouTubeVideo.countDocuments({ isShort: true, status: "approved" }),
      rejected: await YouTubeVideo.countDocuments({ isShort: true, status: "rejected" }),
    };

    return NextResponse.json({
      success: true,
      shorts,
      counts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
