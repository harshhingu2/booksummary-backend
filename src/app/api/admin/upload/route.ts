export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";

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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "images"; // "images" or "audio"

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const folder = type === "audio" ? "audiobooks" : "book-covers";
    const publicFileUrl = await uploadToR2({
      fileBuffer: buffer,
      fileName: file.name,
      contentType: file.type || (type === "audio" ? "audio/mpeg" : "image/jpeg"),
      folder,
    });

    return NextResponse.json({
      success: true,
      url: publicFileUrl,
      fileName: file.name,
      size: file.size,
      type,
    });
  } catch (error: any) {
    console.error("Cloudflare R2 upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to upload file to Cloudflare R2",
      },
      { status: 500 }
    );
  }
}
