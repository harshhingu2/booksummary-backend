import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChapter {
  chapterNumber: number;
  title: string;
}

export interface IBookSummary extends Document {
  title: string;
  topic: string;
  coverImage: string;
  audioUrl?: string; // Audiobook or audio narration URL in Cloudflare R2
  readingTimeMinutes: number;
  shortDescription?: string;
  content: string; // HTML formatted content
  chapters?: IChapter[];
  isTopCombine: boolean;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema = new Schema<IChapter>({
  chapterNumber: { type: Number, required: true },
  title: { type: String, required: true },
});

const BookSummarySchema = new Schema<IBookSummary>(
  {
    title: { type: String, required: true, index: true },
    topic: { type: String, required: true, index: true }, // e.g., Money, Psychology, Productivity
    coverImage: { type: String, required: true },
    audioUrl: { type: String, default: "" },
    readingTimeMinutes: { type: Number, default: 10 },
    shortDescription: { type: String, default: "" },
    content: { type: String, required: true }, // Rich HTML content
    chapters: { type: [ChapterSchema], default: [] },
    isTopCombine: { type: Boolean, default: true, index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "PENDING"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
    strict: false,
    collection: "topcombinebooksummary",
  }
);

if (mongoose.models.BookSummary) {
  delete mongoose.models.BookSummary;
}

export const BookSummary: Model<IBookSummary> =
  mongoose.models.BookSummary ||
  mongoose.model<IBookSummary>("BookSummary", BookSummarySchema, "topcombinebooksummary");
