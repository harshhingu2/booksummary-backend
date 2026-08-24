import mongoose, { Schema, Document, Model } from "mongoose";

export interface IYouTubeChannel extends Document {
  channelId: string;
  channelName: string;
  channelUrl: string;
  feedUrl: string;
  defaultCategory: string;
  isActive: boolean;
  lastFetchedAt?: Date;
  lastSuccessfulFetchAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const YouTubeChannelSchema = new Schema<IYouTubeChannel>(
  {
    channelId: { type: String, required: true, unique: true, index: true },
    channelName: { type: String, required: true, trim: true },
    channelUrl: { type: String, required: true, trim: true },
    feedUrl: { type: String, required: true, trim: true },
    defaultCategory: { type: String, required: true, default: "General", index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastFetchedAt: { type: Date },
    lastSuccessfulFetchAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "youtube_channels",
  }
);

if (mongoose.models.YouTubeChannel) {
  delete mongoose.models.YouTubeChannel;
}

export const YouTubeChannel: Model<IYouTubeChannel> =
  mongoose.models.YouTubeChannel ||
  mongoose.model<IYouTubeChannel>("YouTubeChannel", YouTubeChannelSchema, "youtube_channels");
