import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { uploadToR2 } from "@/lib/r2";

export function cleanTextForSpeech(raw: string, title?: string, author?: string): string {
  let text = raw || "";

  // Convert block/break HTML tags to newlines so sentences don't merge
  text = text.replace(/<\s*br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n\n");
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, "");
  // Remove inline code
  text = text.replace(/`([^`]+)`/g, "$1");
  // Convert markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove images ![alt](url)
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
  // Remove markdown headings (#, ##, ###)
  text = text.replace(/^#{1,6}\s+/gm, "");
  // Remove bold/italic markers
  text = text.replace(/(\*\*|__|\*|_)/g, "");
  // Remove blockquotes >
  text = text.replace(/^>\s+/gm, "");
  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, "");
  // Collapse multiple newlines
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  const intro = title
    ? `${title}${author ? ` by ${author}` : ""}.\n\n`
    : "";

  const combined = `${intro}${text}`.trim();

  // Escape XML special characters so Edge TTS SSML never breaks
  return combined
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function splitTextIntoChunks(text: string, maxLen = 2000): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const paragraphs = text.split(/\n+/);
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 1 <= maxLen) {
      current = current ? `${current}\n${para}` : para;
    } else {
      if (current) chunks.push(current);
      if (para.length <= maxLen) {
        current = para;
      } else {
        // Split long paragraph by sentences
        const sentences = para.match(/[^.!?]+[.!?]+(\s|$)/g) || [para];
        let sentBuf = "";
        for (const s of sentences) {
          if (sentBuf.length + s.length <= maxLen) {
            sentBuf += s;
          } else {
            if (sentBuf) chunks.push(sentBuf.trim());
            sentBuf = s;
          }
        }
        current = sentBuf.trim();
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

export async function generateAndUploadBookAudio({
  bookId,
  title,
  author,
  content,
  voice = "en-US-ChristopherNeural",
  rate = "-4%",
  pitch = "-2Hz",
}: {
  bookId: string;
  title: string;
  author?: string;
  content: string;
  voice?: string;
  rate?: string;
  pitch?: string;
}): Promise<string> {
  const cleanText = cleanTextForSpeech(content, title, author);
  if (!cleanText) {
    throw new Error("Book content is empty after cleaning");
  }

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const textChunks = splitTextIntoChunks(cleanText, 2000);
  const audioBuffers: Buffer[] = [];

  for (const textChunk of textChunks) {
    const { audioStream } = tts.toStream(textChunk, {
      rate,
      pitch,
    });

    const chunkBuffers: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => chunkBuffers.push(chunk));
      audioStream.on("end", () => resolve());
      audioStream.on("error", (err: Error) => reject(err));
    });

    if (chunkBuffers.length > 0) {
      audioBuffers.push(Buffer.concat(chunkBuffers));
    }
  }

  const audioBuffer = Buffer.concat(audioBuffers);
  if (audioBuffer.length === 0) {
    throw new Error("Generated audio buffer is empty");
  }

  const safeTitle = (title || bookId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);

  const audioUrl = await uploadToR2({
    fileBuffer: audioBuffer,
    fileName: `${safeTitle}_${bookId}.mp3`,
    contentType: "audio/mpeg",
    folder: "audio/books",
  });

  return audioUrl;
}
