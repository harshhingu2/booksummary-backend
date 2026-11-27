import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBookRequest extends Document {
  bookName: string;
  email?: string;
  status: "pending" | "added" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const BookRequestSchema = new Schema<IBookRequest>(
  {
    bookName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ["pending", "added", "rejected"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "book_requests",
  }
);

if (mongoose.models.BookRequest) {
  delete mongoose.models.BookRequest;
}

export const BookRequest: Model<IBookRequest> =
  mongoose.models.BookRequest ||
  mongoose.model<IBookRequest>("BookRequest", BookRequestSchema, "book_requests");
