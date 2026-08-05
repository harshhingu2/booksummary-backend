import { NextRequest, NextResponse } from "next/server";
import { apiCache } from "@/lib/cache";

export async function GET() {
  try {
    const stats = apiCache.getStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let keyPattern: string | undefined = undefined;
    try {
      const body = await request.json();
      keyPattern = body.keyPattern;
    } catch (e) {
      // Body might be empty when clearing all
    }

    const clearedCount = apiCache.delete(keyPattern);

    return NextResponse.json({
      success: true,
      message: keyPattern
        ? `Cleared ${clearedCount} cache entries matching pattern '${keyPattern}'`
        : `Cleared all ${clearedCount} cache entries successfully`,
      clearedCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
