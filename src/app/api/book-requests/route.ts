import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { BookRequest } from "@/models/BookRequest";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const bookName = typeof body?.bookName === "string" ? body.bookName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!bookName) {
      return NextResponse.json(
        { success: false, error: "Book name is required." },
        { status: 400 }
      );
    }

    const created = await BookRequest.create({
      bookName,
      ...(email ? { email } : {}),
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save book request." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const requests = await BookRequest.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch book requests." },
      { status: 500 }
    );
  }
}
