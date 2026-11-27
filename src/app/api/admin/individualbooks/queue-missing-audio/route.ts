export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { IndividualBook } from "@/models/IndividualBook";

export async function POST() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const res = await IndividualBook.updateMany(
      {
        contentStatus: "APPROVED",
        content: { $exists: true, $nin: [null, ""] },
        $or: [{ audioUrl: { $exists: false } }, { audioUrl: null }, { audioUrl: "" }],
        needsAudioGeneration: { $ne: true },
      },
      { $set: { needsAudioGeneration: true } }
    );

    return NextResponse.json({
      success: true,
      queuedCount: res.modifiedCount ?? 0,
      message: `Added ${res.modifiedCount ?? 0} approved book(s) without audio to the audio queue.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to queue books for audio." },
      { status: 500 }
    );
  }
}
