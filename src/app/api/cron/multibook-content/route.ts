export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max runtime

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { BookSummary } from "@/models/Book";
import { Prompt } from "@/models/Prompt";
import { AdminSetting } from "@/models/AdminSetting";
import path from "path";
import {
  acquireCronLock,
  isCronAborted,
  releaseCronLock,
  runLockedScraper,
} from "@/lib/cronLock";
import { getGeminiConfig, generateWithGemini, runGeminiWorkerPool } from "@/lib/geminiClient";

const LOCK_KEY = "__multibookCronLock";

export async function GET(request: NextRequest) {
  let lockAcquired = false;
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dumbscroll_cron_secret_2026_v1";

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      const secretParam = request.nextUrl.searchParams.get("secret");
      if (secretParam !== cronSecret) {
        return NextResponse.json({ success: false, error: "Unauthorized cron execution" }, { status: 401 });
      }
    }

    if (!acquireCronLock(LOCK_KEY)) {
      console.log("[Cron MultiBook AI] Already running. Skipping overlapping trigger.");
      return NextResponse.json(
        { success: false, message: "Multi-book content cron is already running. Skipping overlapping trigger." },
        { status: 409 }
      );
    }
    lockAcquired = true;

    await connectDB();

    // Fetch specific scraper setting first, fallback to defaultAiScraper
    const multibookSetting = await AdminSetting.findOne({ key: "multibookAiScraper" });
    const defaultSetting = !multibookSetting ? await AdminSetting.findOne({ key: "defaultAiScraper" }) : null;
    const selectedScraperValue = multibookSetting?.value ?? defaultSetting?.value;
    const selectedRaw = String(selectedScraperValue).toLowerCase();
    const scraperEngine: "chatgpt" | "deepseek" | "gemini" =
      selectedRaw === "chatgpt" ? "chatgpt" : selectedRaw === "gemini" ? "gemini" : "deepseek";

    const geminiConfig = scraperEngine === "gemini" ? await getGeminiConfig() : null;
    if (scraperEngine === "gemini" && (!geminiConfig || geminiConfig.accounts.length === 0)) {
      return NextResponse.json(
        { success: false, error: "No active Gemini API accounts configured in Admin Settings." },
        { status: 400 }
      );
    }

    const batchLimitSetting = await AdminSetting.findOne({
      key: "multibookCronBatchSize",
    });
    let batchLimit = 5;
    if (batchLimitSetting && typeof batchLimitSetting.value !== "undefined") {
      const parsed = parseInt(String(batchLimitSetting.value), 10);
      if (!isNaN(parsed) && parsed > 0) {
        batchLimit = Math.min(parsed, 50); // safety cap
      }
    }

    // Fetch random delay range settings (default: 30s to 150s [2.5 mins])
    const minDelaySetting = await AdminSetting.findOne({ key: "multibookCronMinDelaySeconds" });
    const maxDelaySetting = await AdminSetting.findOne({ key: "multibookCronMaxDelaySeconds" });
    const minDelaySec = minDelaySetting && !isNaN(Number(minDelaySetting.value)) ? Math.max(0, Number(minDelaySetting.value)) : 30;
    const maxDelaySec = maxDelaySetting && !isNaN(Number(maxDelaySetting.value)) ? Math.max(minDelaySec, Number(maxDelaySetting.value)) : 150;

    // Find multi-book summaries flagged for AI content generation, limited to totalBooksLimit (for Gemini) or batchLimit
    const effectiveLimit = scraperEngine === "gemini" && geminiConfig ? geminiConfig.totalBooksLimit : batchLimit;
    const pendingSummaries = await BookSummary.find({ needsContentGeneration: true }).limit(effectiveLimit);

    if (pendingSummaries.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No multi-book summaries pending content generation.",
        processed: 0,
        scraperUsed: scraperEngine,
      });
    }

    // Get active multi-book prompt template
    const defaultPromptDoc =
      (await Prompt.findOne({ type: "multibook", isActive: true, isDefault: true })) ||
      (await Prompt.findOne({ type: "multibook", isActive: true }).sort({ updatedAt: -1 }));

    const template =
      defaultPromptDoc?.content ||
      `> **Topic / Title:** {{topic}} — {{books}}\n> **Content Type:** {{contentType}}\n\nWrite a deep, engaging, multi-book synthesis formatted in clean HTML tags (<h2>, <h3>, <p>, <ul>, <li>, <blockquote>).`;

    const results: Array<{ id: string; title: string; success: boolean; error?: string }> = [];

    const scriptName = scraperEngine === "chatgpt" ? "chatgptScraper.mjs" : "deepseekScraper.mjs";
    const scriptPath = path.join(process.cwd(), "scripts", scriptName);

    const buildPrompt = (summary: any) => {
      const topicVal = summary.topic || "General";
      const booksVal = summary.title || "";
      const contentTypeVal = "Multi-Book Synthesis";

      let populatedPrompt = template
        .replace(/\{\{topic\}\}/gi, topicVal)
        .replace(/\{\{books\}\}/gi, booksVal)
        .replace(/\{\{title\}\}/gi, booksVal)
        .replace(/\{\{contentType\}\}/gi, contentTypeVal)
        .replace(/\{\{audience\}\}/gi, "US/Western adults")
        .replace(/\{\{targetLength\}\}/gi, "~2,000 words")
        .replace(/\{\{goal\}\}/gi, "[Decided by you]");

      const topSlice = populatedPrompt.slice(0, 600);
      const hasTopicAtTop = /^\s*(?:>\s*)?\*\*Topic/im.test(topSlice);
      const hasBooksAtTop = /^\s*(?:>\s*)?\*\*(?:Books?|Title)/im.test(topSlice);
      if (!hasTopicAtTop || !hasBooksAtTop) {
        const headerLines: string[] = [
          `**Topic:** ${topicVal}`,
          `**Books:** ${booksVal}`,
        ];
        if (!/^\s*(?:>\s*)?\*\*Content Type:\*\*/im.test(topSlice)) {
          headerLines.push(`**Content Type:** ${contentTypeVal}`);
        }
        populatedPrompt = headerLines.join("\n\n") + "\n\n" + populatedPrompt.trimStart();
      }
      return populatedPrompt;
    };

    if (scraperEngine === "gemini" && geminiConfig) {
      const { accounts, concurrencyLimit } = geminiConfig;
      await runGeminiWorkerPool(
        pendingSummaries,
        accounts,
        concurrencyLimit,
        () => isCronAborted(LOCK_KEY),
        async (summary, account) => {
          try {
            console.log(`[Cron MultiBook AI] Generating content for "${summary.title}" via Gemini (${account.label} / ${account.model})...`);
            const generatedContent = await generateWithGemini(account, buildPrompt(summary));
            await BookSummary.findByIdAndUpdate(summary._id, {
              pendingContent: generatedContent,
              pendingContentGeneratedAt: new Date(),
              contentStatus: "PENDING_REVIEW",
              needsContentGeneration: false,
            });
            results.push({ id: summary._id.toString(), title: summary.title, success: true });
            console.log(`[Cron MultiBook AI] Completed "${summary.title}" via Gemini (${account.label}).`);
          } catch (err: any) {
            console.error(`[Cron MultiBook AI Error] Failed for "${summary.title}" (Gemini / ${account.label}):`, err.message);
            results.push({ id: summary._id.toString(), title: summary.title, success: false, error: err.message });
          }
        }
      );
    } else {
      for (const summary of pendingSummaries) {
        if (isCronAborted(LOCK_KEY)) {
          console.log("[Cron MultiBook AI] Aborted by admin kill request.");
          break;
        }
        try {
          const populatedPrompt = buildPrompt(summary);

          console.log(`[Cron MultiBook AI] Generating content for "${summary.title}" via ${scraperEngine}...`);

          const { stdout } = await runLockedScraper(LOCK_KEY, scriptPath, populatedPrompt);

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

          // Update summary with pending content, set contentStatus to PENDING_REVIEW, and clear the cron flag
          await BookSummary.findByIdAndUpdate(summary._id, {
            pendingContent: generatedContent,
            pendingContentGeneratedAt: new Date(),
            contentStatus: "PENDING_REVIEW",
            needsContentGeneration: false,
          });

          results.push({ id: summary._id.toString(), title: summary.title, success: true });
          console.log(`[Cron MultiBook AI] Completed "${summary.title}". Browser closed cleanly.`);

          // Anti-bot randomized pause between sequential scrapings if there are more items in this batch
          if (results.length < pendingSummaries.length) {
            const randomDelaySec = Math.floor(Math.random() * (maxDelaySec - minDelaySec + 1)) + minDelaySec;
            console.log(`[Cron MultiBook AI] Anti-bot human delay: waiting ${randomDelaySec}s (${(randomDelaySec / 60).toFixed(1)} mins) before processing next summary...`);
            await new Promise((resolve) => setTimeout(resolve, randomDelaySec * 1000));
          } else {
            // Minimal 3s cooldown after the last summary in the batch
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        } catch (err: any) {
          console.error(`[Cron MultiBook AI Error] Failed for "${summary.title}":`, err.message);
          results.push({ id: summary._id.toString(), title: summary.title, success: false, error: err.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} multi-book summaries for content generation.`,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (lockAcquired) {
      releaseCronLock(LOCK_KEY);
    }
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
