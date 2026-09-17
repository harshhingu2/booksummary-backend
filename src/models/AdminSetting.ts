import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdminSetting extends Document {
  key: string;
  value: any;
  description?: string;
  updatedAt: Date;
  createdAt: Date;
}

const AdminSettingSchema = new Schema<IAdminSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

export const AdminSetting: Model<IAdminSetting> =
  mongoose.models.AdminSetting || mongoose.model<IAdminSetting>("AdminSetting", AdminSettingSchema);
