export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { IndividualBook } from "@/models/IndividualBook";
import { AdminSetting } from "@/models/AdminSetting";
import { generateAndUploadBookAudio } from "@/lib/audioGenerator";
import { deleteFromR2 } from "@/lib/r2";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "dumbscroll_cron_secret_2026_v1";

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const settingsDocs = await AdminSetting.find({
      key: {
        $in: ["audioVoice", "audioRate", "audioPitch", "audioConcurrency", "audioBatchSize"],
      },
    });
    const settings: Record<string, any> = {};
    for (const doc of settingsDocs) {
      settings[doc.key] = doc.value;
    }

    const voice = settings.audioVoice || "en-US-ChristopherNeural";
    const rate = settings.audioRate || "-4%";
    const pitch = settings.audioPitch || "-2Hz";
    const concurrency = Math.max(1, Math.min(10, Number(settings.audioConcurrency) || 3));
    const batchSize = Math.max(1, Math.min(50, Number(settings.audioBatchSize) || 10));

    const books = await IndividualBook.find({
      needsAudioGeneration: true,
      content: { $exists: true, $ne: "" },
    })
      .sort({ updatedAt: 1 })
      .limit(batchSize);

    if (books.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No books in Audio Queue",
        processed: 0,
        succeeded: 0,
        failed: 0,
      });
    }

    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ title: string; error: string }> = [];

    // Process in concurrent chunks
    for (let i = 0; i < books.length; i += concurrency) {
      const chunk = books.slice(i, i + concurrency);

      await Promise.allSettled(
        chunk.map(async (book) => {
          try {
            book.audioStatus = "PROCESSING";
            book.audioError = "";
            await book.save();

            // Delete old audio from R2 if regenerating
            if (book.audioUrl) {
              try {
                await deleteFromR2(book.audioUrl);
              } catch (e) {
                console.warn("Failed to delete old R2 audio:", e);
              }
            }

            const audioUrl = await generateAndUploadBookAudio({
              bookId: book._id.toString(),
              title: book.title,
              author: book.author,
              content: book.content,
              voice,
              rate,
              pitch,
            });

            book.audioUrl = audioUrl;
            book.audioStatus = "COMPLETED";
            book.needsAudioGeneration = false;
            book.audioError = "";
            await book.save();
            succeeded++;
          } catch (err: any) {
            const errMsg = err?.message || "Audio generation failed";
            book.audioStatus = "FAILED";
            book.audioError = errMsg;
            await book.save();
            errors.push({ title: book.title, error: errMsg });
            failed++;
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      message: `Audio Cron completed: ${succeeded} succeeded, ${failed} failed`,
      processed: books.length,
      succeeded,
      failed,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
