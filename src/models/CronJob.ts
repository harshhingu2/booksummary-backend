import mongoose, { Schema, Document, Model } from "mongoose";

export type CronStatus = "success" | "failed" | "running" | "never";

export interface ICronJob extends Document {
  name: string;
  schedule: string; // Cron expression, e.g. "*/15 * * * *"
  endpoint: string; // Target endpoint URL or internal identifier
  isActive: boolean;
  lastRunAt?: Date;
  lastStatus: CronStatus;
  lastRunResult?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CronJobSchema = new Schema<ICronJob>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    schedule: { type: String, required: true, default: "*/15 * * * *" },
    endpoint: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    lastRunAt: { type: Date },
    lastStatus: {
      type: String,
      enum: ["success", "failed", "running", "never"],
      default: "never",
    },
    lastRunResult: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "cron_jobs",
  }
);

if (mongoose.models.CronJob) {
  delete mongoose.models.CronJob;
}

export const CronJob: Model<ICronJob> =
  mongoose.models.CronJob || mongoose.model<ICronJob>("CronJob", CronJobSchema, "cron_jobs");
