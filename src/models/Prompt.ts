import mongoose, { Schema, Document, Model } from "mongoose";

export type PromptType = "individual" | "multibook";

export interface IPrompt extends Document {
  name: string;
  type: PromptType; // "individual" or "multibook"
  content: string; // The prompt text/template
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromptSchema = new Schema<IPrompt>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["individual", "multibook"],
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    collection: "prompts",
  }
);

if (mongoose.models.Prompt) {
  delete mongoose.models.Prompt;
}

export const Prompt: Model<IPrompt> =
  mongoose.models.Prompt || mongoose.model<IPrompt>("Prompt", PromptSchema, "prompts");
