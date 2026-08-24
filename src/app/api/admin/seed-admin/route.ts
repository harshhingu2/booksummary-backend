import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || "abcmailmy2019@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "AdminSecurePass!2026#DumbScroll";
    const adminName = process.env.ADMIN_NAME || "System Admin";

    let user = await User.findOne({ email: adminEmail }).select("+password");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (user) {
      user.password = hashedPassword;
      user.role = "ADMIN";
      user.isActive = true;
      await user.save();
      return NextResponse.json({
        success: true,
        message: `Admin account '${adminEmail}' password updated successfully.`,
        credentials: { email: adminEmail, password: adminPassword },
      });
    }

    const newAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully!",
      credentials: { email: adminEmail, password: adminPassword },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
