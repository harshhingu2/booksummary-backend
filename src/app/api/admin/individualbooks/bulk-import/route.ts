import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { IndividualBook } from "@/models/IndividualBook";
import * as XLSX from "xlsx";

/**
 * Robust CSV parser fallback if not binary excel
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (char === "\n" && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || "";
    });
    records.push(record);
  }

  return records;
}

/**
 * POST /api/admin/individualbooks/bulk-import
 * Accepts multipart/form-data (.xlsx, .xls, .csv) or JSON payload
 * In-memory parsing only — does NOT save files to disk or cloud storage.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const contentType = req.headers.get("content-type") || "";
    let rawRows: any[] = [];

    if (contentType.includes("application/json")) {
      const body = await req.json();
      rawRows = Array.isArray(body.books) ? body.books : (Array.isArray(body) ? body : []);
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        // Parse Excel workbook in-memory
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      } else {
        // Parse CSV/Text in-memory
        const text = buffer.toString("utf-8");
        try {
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const firstSheetName = workbook.SheetNames[0];
          rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: "" });
        } catch {
          rawRows = parseCSV(text);
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported Content-Type. Please upload an Excel (.xlsx/.xls) or CSV file." },
        { status: 400 }
      );
    }

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No records found in the uploaded file. Please make sure the file contains rows under the 'Title' column." },
        { status: 400 }
      );
    }

    const docsToInsert: any[] = [];
    const skippedRows: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // Match keys case-insensitively
      const normalizedRow: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        normalizedRow[key.toLowerCase().replace(/[^a-z0-9]/g, "")] = row[key];
      }

      const title = (
        normalizedRow.title ||
        normalizedRow.booktitle ||
        normalizedRow.book ||
        normalizedRow.name ||
        row.Title ||
        ""
      ).toString().trim();

      if (!title) {
        skippedRows.push(`Row #${i + 2}: Empty title`);
        continue;
      }

      const author = (
        normalizedRow.author ||
        normalizedRow.authorname ||
        normalizedRow.writer ||
        row.Author ||
        ""
      ).toString().trim();

      const topic = (
        normalizedRow.topic ||
        normalizedRow.category ||
        normalizedRow.genre ||
        row.Topic ||
        "Productivity"
      ).toString().trim() || "Productivity";

      const shortDescription = (
        normalizedRow.shortdescription ||
        normalizedRow.description ||
        normalizedRow.summary ||
        row["Short Description"] ||
        row.ShortDescription ||
        ""
      ).toString().trim();

      let readingTimeMinutes = 12;
      const rawTime =
        normalizedRow.readingtimeminutes ||
        normalizedRow.readingtime ||
        normalizedRow.time ||
        row["Reading Time (Minutes)"] ||
        row.ReadingTimeMinutes;

      if (rawTime) {
        const parsedTime = parseInt(rawTime.toString().replace(/\D/g, ""), 10);
        if (!isNaN(parsedTime) && parsedTime > 0) {
          readingTimeMinutes = parsedTime;
        }
      }

      // Check if book should be queued for AI content generation
      // Supports "Add AI Queue", "AI Queue", "Queue", etc.
      // Defaults to true if omitted or empty, or explicitly set to true/yes/1
      const rawAiQueue =
        normalizedRow.addaiqueue ??
        normalizedRow.aiqueue ??
        normalizedRow.queue ??
        normalizedRow.needscontentgeneration ??
        row["Add AI Queue"] ??
        row["AI Queue"];

      let needsContentGeneration = true;
      if (rawAiQueue !== undefined && rawAiQueue !== null && rawAiQueue !== "") {
        const valStr = String(rawAiQueue).trim().toLowerCase();
        if (valStr === "false" || valStr === "0" || valStr === "no") {
          needsContentGeneration = false;
        } else {
          needsContentGeneration = true;
        }
      }

      docsToInsert.push({
        title,
        author,
        topic,
        coverImage: "", // No image required for bulk import
        audioUrl: "",   // No audio required for bulk import
        readingTimeMinutes,
        shortDescription,
        content: "",
        pendingContent: "",
        contentStatus: "DRAFT",
        isFeatured: false,
        status: "PENDING",
        needsContentGeneration, // Queued for automated cron scraper if true
      });
    }

    if (docsToInsert.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid books found to import. Please make sure the 'Title' column is provided.",
          skippedRows,
        },
        { status: 400 }
      );
    }

    // Insert into MongoDB
    const inserted = await IndividualBook.insertMany(docsToInsert, { ordered: false });

    return NextResponse.json({
      success: true,
      importedCount: inserted.length,
      skippedCount: skippedRows.length,
      skippedRows,
      message: `Successfully imported ${inserted.length} book(s) and queued for AI content generation!`,
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to bulk import books" },
      { status: 500 }
    );
  }
}
