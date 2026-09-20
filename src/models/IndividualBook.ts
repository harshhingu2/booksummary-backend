import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChapter {
  chapterNumber: number;
  title: string;
}

export interface IIndividualBook extends Document {
  title: string;
  author?: string;
  topic: string;
  coverImage: string;
  audioUrl?: string; // Audiobook or audio narration URL in Cloudflare R2
  readingTimeMinutes: number;
  shortDescription?: string;
  content: string;
  pendingContent?: string; // Newly generated AI content awaiting admin review
  contentStatus?: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED"; // Review status of the content
  chapters?: IChapter[];
  isFeatured?: boolean;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  needsContentGeneration?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema = new Schema<IChapter>({
  chapterNumber: { type: Number, required: true },
  title: { type: String, required: true },
});

const IndividualBookSchema = new Schema<IIndividualBook>(
  {
    title: { type: String, required: true, index: true },
    author: { type: String, default: "" },
    topic: { type: String, required: true, index: true },
    coverImage: { type: String, required: true },
    audioUrl: { type: String, default: "" },
    readingTimeMinutes: { type: Number, default: 12 },
    shortDescription: { type: String, default: "" },
    content: { type: String, default: "" },
    pendingContent: { type: String, default: "" }, // Raw/formatted AI output awaiting approval
    contentStatus: {
      type: String,
      enum: ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"],
      default: "DRAFT",
      index: true,
    },
    chapters: { type: [ChapterSchema], default: [] },
    isFeatured: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "PENDING"],
      default: "ACTIVE",
      index: true,
    },
    needsContentGeneration: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: false,
    collection: "individualbooks",
  }
);

if (mongoose.models.IndividualBook) {
  delete mongoose.models.IndividualBook;
}

export const IndividualBook: Model<IIndividualBook> =
  mongoose.models.IndividualBook ||
  mongoose.model<IIndividualBook>("IndividualBook", IndividualBookSchema, "individualbooks");
