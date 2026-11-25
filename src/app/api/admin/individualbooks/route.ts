export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { IndividualBook } from "@/models/IndividualBook";
import { Category } from "@/models/Category";
import { CronJob } from "@/models/CronJob";
import { AdminSetting } from "@/models/AdminSetting";

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
    const search = searchParams.get("search") || "";
    const topic = searchParams.get("topic") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const status = searchParams.get("status") || "";
    const contentStatus = searchParams.get("contentStatus") || "";
    const featured = searchParams.get("featured") || "";
    const contentPresence = searchParams.get("contentPresence") || "";
    const sortBy = searchParams.get("sortBy") || "rank_desc";

    const rawLimit = Number(searchParams.get("limit")) || 20;
    const limit = [10, 20, 50, 100, 200].includes(rawLimit) ? rawLimit : 20;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const query: any = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
      ];
    }
    if (categoryId && categoryId !== "ALL") {
      query.categoryId = categoryId;
    } else if (topic && topic !== "All") {
      query.topic = { $regex: topic, $options: "i" };
    }
    if (status && status !== "ALL") {
      query.status = status;
    }
    if (contentStatus && contentStatus !== "ALL") {
      query.contentStatus = contentStatus;
    }
    if (featured === "FEATURED") {
      query.isFeatured = true;
    } else if (featured === "NOT_FEATURED") {
      query.isFeatured = false;
    }
    if (contentPresence === "EMPTY_PRODUCTION") {
      query.$and = [
        ...(query.$and || []),
        { $or: [{ content: "" }, { content: { $exists: false } }, { content: null }] },
      ];
    } else if (contentPresence === "EMPTY_UNQUEUED") {
      query.$and = [
        ...(query.$and || []),
        { $or: [{ content: "" }, { content: { $exists: false } }, { content: null }] },
        { needsContentGeneration: { $ne: true } },
      ];
    } else if (contentPresence === "QUEUED") {
      query.needsContentGeneration = true;
    }

    const sortMap: Record<string, any> = {
      rank_desc: { rank: -1, createdAt: -1 },
      rank_asc: { rank: 1, createdAt: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      title_asc: { title: 1 },
      title_desc: { title: -1 },
    };
    const sortObj = sortMap[sortBy] || sortMap.rank_desc;

    const [books, total, queuedCount, cronJobDoc, batchSizeDoc] = await Promise.all([
      IndividualBook.find(query)
        .populate("categoryId", "name slug")
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit),
      IndividualBook.countDocuments(query),
      IndividualBook.countDocuments({ needsContentGeneration: true }),
      CronJob.findOne({ endpoint: { $regex: "individual-content" } }),
      AdminSetting.findOne({ key: "individualCronBatchSize" }),
    ]);

    const batchLimit = batchSizeDoc && !isNaN(Number(batchSizeDoc.value)) ? Number(batchSizeDoc.value) : 5;
    const cronSchedule = cronJobDoc?.schedule || "*/15 * * * *";
    const isCronActive = cronJobDoc ? !!cronJobDoc.isActive : false;

    return NextResponse.json({
      success: true,
      books,
      count: books.length,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      queueInfo: {
        queuedCount,
        batchLimit,
        cronSchedule,
        isCronActive,
        cronName: cronJobDoc?.name || "Individual Books AI Content Ingestion",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyAdminAuth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();

    const newBook = await IndividualBook.create(body);

    return NextResponse.json({
      success: true,
      message: "Individual book created successfully",
      book: newBook,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
