export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

async function verifyAdminAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return false;
  }
  return session;
}

const SCREENSHOTS = [
  { key: "chatgpt", label: "ChatGPT Scraper", filename: "debug_chatgpt.png" },
  { key: "deepseek", label: "DeepSeek Scraper", filename: "debug_deepseek.png" },
];

export async function GET() {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  const publicDir = path.resolve(process.cwd(), "public");

  const items = SCREENSHOTS.map((item) => {
    const filePath = path.join(publicDir, item.filename);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      return {
        ...item,
        exists: true,
        url: `/${item.filename}?t=${Math.floor(stat.mtimeMs)}`,
        updatedAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
      };
    }
    return {
      ...item,
      exists: false,
      url: null,
      updatedAt: null,
      sizeBytes: 0,
    };
  });

  return NextResponse.json({ success: true, screenshots: items });
}
