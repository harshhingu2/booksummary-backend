import mongoose from "mongoose";
import fs from "fs";

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
    return mongoose.connection;
  }

  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  return mongoose.connection;
}
