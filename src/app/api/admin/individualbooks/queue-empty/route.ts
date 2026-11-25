export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { IndividualBook } from "@/models/IndividualBook";

async function verifyAdminAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return false;
  }
  return session;
}

export async function POST() {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();

    const result = await IndividualBook.updateMany(
      {
        $or: [{ content: "" }, { content: { $exists: false } }, { content: null }],
        needsContentGeneration: { $ne: true },
      },
      {
        $set: { needsContentGeneration: true },
      }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `Added ${result.modifiedCount} book(s) with empty production content to the AI Cron Queue.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
