import mongoose, { Schema, Document, Model } from "mongoose";

export type VideoStatus = "pending" | "approved" | "rejected";

export interface IYouTubeVideo extends Document {
  videoId: string;
  channelId: string;
  channelName: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: Date;
  category: string;
  source: string;
  isShort: boolean;
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
}

const YouTubeVideoSchema = new Schema<IYouTubeVideo>(
  {
    videoId: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true, index: true },
    channelName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, required: true },
    publishedAt: { type: Date, required: true, index: true },
    category: { type: String, required: true, index: true },
    source: { type: String, default: "youtube" },
    isShort: { type: Boolean, default: true, index: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "youtube_videos",
  }
);

if (mongoose.models.YouTubeVideo) {
  delete mongoose.models.YouTubeVideo;
}

export const YouTubeVideo: Model<IYouTubeVideo> =
  mongoose.models.YouTubeVideo ||
  mongoose.model<IYouTubeVideo>("YouTubeVideo", YouTubeVideoSchema, "youtube_videos");
