import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";

if (fs.existsSync(".env.local")) {
  try {
    process.loadEnvFile(".env.local");
  } catch (e) {}
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/dumbscroll";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "admin" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "users" }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema, "users");

async function seedAdmin() {
  try {
    console.log("Connecting to MongoDB:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);

    const adminEmail = process.env.ADMIN_EMAIL || "admin@dumbscroll.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "AdminPassword123!";
    const adminName = process.env.ADMIN_NAME || "System Admin";

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`Admin user with email '${adminEmail}' already exists.`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      existingAdmin.password = hashedPassword;
      existingAdmin.role = "admin";
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log(`Updated password for admin user '${adminEmail}'. Password reset to: ${adminPassword}`);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      const newAdmin = new User({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        isActive: true,
      });

      await newAdmin.save();
      console.log(`Successfully created Admin user!`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin user:", error);
    process.exit(1);
  }
}

seedAdmin();
