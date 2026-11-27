export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { IndividualBook } from "@/models/IndividualBook";
import { deleteFromR2 } from "@/lib/r2";

async function verifyAdminAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return false;
  }
  return session;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();

    const book = await IndividualBook.findById(id);
    if (!book) {
      return NextResponse.json({ success: false, error: "Book not found" }, { status: 404 });
    }

    if (!book.content || !book.content.trim()) {
      return NextResponse.json(
        { success: false, error: "Book has no content to generate audio from" },
        { status: 400 }
      );
    }

    book.needsAudioGeneration = true;
    book.audioStatus = "PENDING";
    book.audioError = "";
    await book.save();

    return NextResponse.json({
      success: true,
      message: "Book added to Audio Queue",
      book,
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
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();

    const book = await IndividualBook.findById(id);
    if (!book) {
      return NextResponse.json({ success: false, error: "Book not found" }, { status: 404 });
    }

    if (book.audioUrl) {
      try {
        await deleteFromR2(book.audioUrl);
      } catch (err) {
        console.warn("Failed to delete audio from R2:", err);
      }
    }

    book.audioUrl = "";
    book.audioStatus = "NONE";
    book.needsAudioGeneration = false;
    book.audioError = "";
    await book.save();

    return NextResponse.json({
      success: true,
      message: "Audio deleted from Cloudflare R2 and database",
      book,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
