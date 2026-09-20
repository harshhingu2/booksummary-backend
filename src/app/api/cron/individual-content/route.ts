export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max runtime

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { IndividualBook } from "@/models/IndividualBook";
import { Prompt } from "@/models/Prompt";
import { AdminSetting } from "@/models/AdminSetting";
import { execFile } from "child_process";
import path from "path";
import util from "util";

const execFilePromise = util.promisify(execFile);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dumbscroll_cron_secret_2026_v1";

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      const secretParam = request.nextUrl.searchParams.get("secret");
      if (secretParam !== cronSecret) {
        return NextResponse.json({ success: false, error: "Unauthorized cron execution" }, { status: 401 });
      }
    }

    await connectDB();

    // Fetch scraper setting (defaults to deepseek)
    const scraperSetting = await AdminSetting.findOne({
      key: { $in: ["individualAiScraper", "defaultAiScraper"] },
    });
    const scraperEngine: "chatgpt" | "deepseek" =
      scraperSetting?.value === "chatgpt" ? "chatgpt" : "deepseek";

    // Find all individual books flagged for AI content generation
    const pendingBooks = await IndividualBook.find({ needsContentGeneration: true }).limit(5);

    if (pendingBooks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No individual books pending content generation.",
        processed: 0,
        scraperUsed: scraperEngine,
      });
    }

    // Get active individual prompt template
    const defaultPromptDoc =
      (await Prompt.findOne({ type: "individual", isActive: true, isDefault: true })) ||
      (await Prompt.findOne({ type: "individual", isActive: true }).sort({ updatedAt: -1 }));

    const template =
      defaultPromptDoc?.content ||
      `> **Topic / Title:** {{topic}} — {{title}}\n> **Content Type:** {{contentType}}\n\nWrite a deep, engaging, and high-impact book summary formatted in clean HTML tags (<h2>, <h3>, <p>, <ul>, <li>, <blockquote>).`;

    const results: Array<{ id: string; title: string; success: boolean; error?: string }> = [];

    const scriptName = scraperEngine === "chatgpt" ? "chatgptScraper.mjs" : "deepseekScraper.mjs";
    const scriptPath = path.join(process.cwd(), "scripts", scriptName);

    for (const book of pendingBooks) {
      try {
        const topicVal = book.topic || "General";
        const titleVal = book.title || "";
        const authorVal = book.author || "";
        const contentTypeVal = "Single Book Summary";

        const populatedPrompt = template
          .replace(/\{\{topic\}\}/gi, topicVal)
          .replace(/\{\{title\}\}/gi, titleVal)
          .replace(/\{\{books\}\}/gi, titleVal)
          .replace(/\{\{author\}\}/gi, authorVal)
          .replace(/\{\{contentType\}\}/gi, contentTypeVal)
          .replace(/\{\{audience\}\}/gi, "US/Western adults")
          .replace(/\{\{targetLength\}\}/gi, "~1,500 words")
          .replace(/\{\{goal\}\}/gi, "[Decided by you]");

        console.log(`[Cron Individual AI] Generating content for "${book.title}" via ${scraperEngine}...`);

        const { stdout } = await execFilePromise(
          process.execPath,
          [scriptPath, "--headless", populatedPrompt],
          { timeout: 180000, maxBuffer: 10 * 1024 * 1024 }
        );

        const startMarker = scraperEngine === "chatgpt" ? "--- ChatGPT Response ---\n\n" : "--- DeepSeek Response ---\n\n";
        const endMarker = "\n\n-------------------------";
        let generatedContent = "";

        const startIndex = stdout.indexOf(startMarker);
        const endIndex = stdout.indexOf(endMarker);

        if (startIndex !== -1 && endIndex !== -1) {
          generatedContent = stdout.substring(startIndex + startMarker.length, endIndex).trim();
        } else {
          generatedContent = stdout.trim();
        }

        if (!generatedContent) {
          throw new Error("Empty response from scraper");
        }

        // Update book with pending content, set contentStatus to PENDING_REVIEW, and clear the cron flag
        await IndividualBook.findByIdAndUpdate(book._id, {
          pendingContent: generatedContent,
          contentStatus: "PENDING_REVIEW",
          needsContentGeneration: false,
        });

        results.push({ id: book._id.toString(), title: book.title, success: true });
        console.log(`[Cron Individual AI] Completed "${book.title}". Browser closed cleanly.`);

        // Short pause between sequential books to allow full process and profile release
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (err: any) {
        console.error(`[Cron Individual AI Error] Failed for "${book.title}":`, err.message);
        results.push({ id: book._id.toString(), title: book.title, success: false, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} individual books for content generation.`,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
