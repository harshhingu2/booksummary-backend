export const dynamic = "force-dynamic";
export const maxDuration = 240; // 4 minutes timeout for AI scraping

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { IndividualBook } from "@/models/IndividualBook";
import { BookSummary } from "@/models/Book";
import { execFile } from "child_process";
import path from "path";
import util from "util";

const execFilePromise = util.promisify(execFile);

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
    const body = await request.json();
    const { id, type, title, author, topic, customPrompt, provider = "chatgpt" } = body;

    if (!id || !title) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (id, title)" },
        { status: 400 }
      );
    }

    const selectedProvider = provider.toLowerCase() === "deepseek" ? "deepseek" : "chatgpt";

    // Dynamically retrieve active prompt template from database if no customPrompt provided
    let prompt = customPrompt && customPrompt.trim() ? customPrompt.trim() : "";
    if (!prompt) {
      try {
        const { Prompt } = await import("@/models/Prompt");
        const promptType = type === "individual" ? "individual" : "multibook";
        const defaultPromptDoc = await Prompt.findOne({ type: promptType, isActive: true, isDefault: true })
          || await Prompt.findOne({ type: promptType, isActive: true }).sort({ updatedAt: -1 });

        if (defaultPromptDoc && defaultPromptDoc.content) {
          prompt = defaultPromptDoc.content
            .replace(/\{\{topic\}\}/g, topic || "General")
            .replace(/\{\{title\}\}/g, title || "")
            .replace(/\{\{books\}\}/g, title || "")
            .replace(/\{\{author\}\}/g, author || "")
            .replace(/\{\{contentType\}\}/g, type === "individual" ? "Single Book Summary" : "Multi-Book Synthesis")
            .replace(/\{\{audience\}\}/g, "US/Western adults")
            .replace(/\{\{targetLength\}\}/g, type === "individual" ? "~1,500 words" : "~2,000 words")
            .replace(/\{\{goal\}\}/g, `Help the reader fundamentally understand the core ideas and applications.`);
        }
      } catch (promptErr) {
        console.warn("[AI Generation] Could not fetch default prompt from DB, using fallback:", promptErr);
      }
    }

    if (!prompt) {
      prompt = `Write a comprehensive, engaging, and high-impact book summary for:
Title: "${title}"
${author ? `Author: "${author}"` : ""}
Topic/Category: "${topic || "General"}"

Please format your response strictly in clean HTML tags (using <h2>, <h3>, <p>, <ul>, <li>, and <blockquote>, without wrapping inside <html> or <body> tags):
1. Executive Core Idea / Big Picture (with a clear introductory paragraph and core takeaway)
2. 3 to 5 Key Chapters / Principles (each marked with <h2> and an insightful title, followed by deep actionable explanations)
3. Memorable Quotes (wrapped in <blockquote>)
4. Actionable Real-World Applications (structured as bullet points with <ul> and <li>)`;
    }

    // Default to headless on Linux/production or when not explicitly requested as headful
    const isLinux = process.platform === "linux";
    const isHeadless = body.headless !== undefined ? Boolean(body.headless) : (isLinux || process.env.NODE_ENV === "production" ? true : false);

    console.log(`[AI Generation] Triggering ${selectedProvider.toUpperCase()} scraper for: "${title}" (${type}, headless: ${isHeadless})...`);

    // Run scraper in child process for memory isolation & headless stability
    const scriptFileName = selectedProvider === "deepseek" ? "deepseekScraper.mjs" : "chatgptScraper.mjs";
    const scriptPath = path.join(process.cwd(), "scripts", scriptFileName);
    const headlessFlag = isHeadless ? "--headless" : "--headful";
    const { stdout, stderr } = await execFilePromise(
      process.execPath,
      [scriptPath, headlessFlag, "--timeout", "200", "--prompt", prompt],
      { timeout: 240000, maxBuffer: 10 * 1024 * 1024 }
    );

    // Extract content between delimiters
    let generatedContent = "";
    const startMarker = selectedProvider === "deepseek" ? "--- DeepSeek Response ---\n\n" : "--- ChatGPT Response ---\n\n";
    const endMarker = "\n\n-------------------------";

    const startIndex = stdout.indexOf(startMarker);
    const endIndex = stdout.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
      generatedContent = stdout.substring(startIndex + startMarker.length, endIndex).trim();
    } else {
      // Fallback: take trimmed stdout
      generatedContent = stdout.trim();
    }

    if (!generatedContent) {
      throw new Error(`Failed to extract response text from ${selectedProvider.toUpperCase()} scraper output.`);
    }

    // Connect to database and update document
    await connectDB();

    let updatedDoc;
    if (type === "individual") {
      updatedDoc = await IndividualBook.findByIdAndUpdate(
        id,
        {
          pendingContent: generatedContent,
          contentStatus: "PENDING_REVIEW",
          needsContentGeneration: false,
        },
        { new: true }
      );
    } else {
      // Top Combine summary
      updatedDoc = await BookSummary.findByIdAndUpdate(
        id,
        {
          pendingContent: generatedContent,
          contentStatus: "PENDING_REVIEW",
          needsContentGeneration: false,
        },
        { new: true }
      );
    }

    if (!updatedDoc) {
      return NextResponse.json(
        { success: false, error: `Document with ID ${id} not found in database.` },
        { status: 404 }
      );
    }

    console.log(`[AI Generation] Successfully saved pending content for "${title}" in DB!`);

    return NextResponse.json({
      success: true,
      message: `Summary content generated and saved to pendingContent (awaiting review) for "${title}"!`,
      pendingContent: generatedContent,
      contentStatus: "PENDING_REVIEW",
      updatedAt: updatedDoc.updatedAt,
    });
  } catch (error: any) {
    console.error("[AI Generation Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          "Failed to generate content. Ensure the AI profile is logged in with: node scripts/chatgptScraper.mjs --login OR node scripts/deepseekScraper.mjs --login",
      },
      { status: 500 }
    );
  }
}
