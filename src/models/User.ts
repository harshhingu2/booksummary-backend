import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "ADMIN" | "EDITOR" | "USER";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["ADMIN", "EDITOR", "USER"],
      default: "USER",
      index: true,
    },
    isActive: { type: Boolean, default: true },
    avatar: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema, "users");
