import mongoose from "mongoose";
import fs from "fs";
import bcrypt from "bcryptjs";

let adminEnsured = false;

async function ensureAdminUserExists() {
  if (adminEnsured) return;
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "abcmailmy2019@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "AdminSecurePass!2026#DumbScroll";
    const adminName = process.env.ADMIN_NAME || "System Admin";

    const UserSchema = new mongoose.Schema(
      {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["ADMIN", "EDITOR", "USER"], default: "ADMIN" },
        isActive: { type: Boolean, default: true },
      },
      { timestamps: true, collection: "users" }
    );

    const User = mongoose.models.User || mongoose.model("User", UserSchema, "users");

    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await User.create({
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
      });

      console.log(`[Auto-Init] Admin account '${adminEmail}' auto-created on app startup!`);
    } else if (existingAdmin.role === "admin" || existingAdmin.role === "user") {
      // Migrate role string uppercase if needed
      existingAdmin.role = "ADMIN";
      await existingAdmin.save();
    }

    adminEnsured = true;
  } catch (err) {
    console.error("[Auto-Init] Failed to ensure admin user on startup:", err);
  }
}

export async function connectDB() {
  if (fs.existsSync(".env.local")) {
    try {
      process.loadEnvFile(".env.local");
    } catch (e) {}
  }

  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
  }

  if (mongoose.connection.readyState === 1) {
    await ensureAdminUserExists();
    return mongoose.connection;
  }

  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI, { bufferCommands: false, serverSelectionTimeoutMS: 5000 });
  await ensureAdminUserExists();
  return mongoose.connection;
}
