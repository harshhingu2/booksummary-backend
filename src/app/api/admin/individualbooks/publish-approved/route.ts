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
        status: { $ne: "ACTIVE" },
      },
      { $set: { status: "ACTIVE" } }
    );

    return NextResponse.json({
      success: true,
      updatedCount: res.modifiedCount ?? 0,
      message: `Activated ${res.modifiedCount ?? 0} approved book(s) (Pub Status set to ACTIVE).`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to activate approved books." },
      { status: 500 }
    );
  }
}
