import mongoose from 'mongoose';
import fs from 'fs';

try {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  }
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI;

async function cleanup() {
  try {
    console.log("Connecting to clean up seeded database 'booksummary'...");
    await mongoose.connect(MONGODB_URI);
    const conn = mongoose.connection.useDb('booksummary');
    await conn.db.dropDatabase();
    console.log("Successfully dropped created 'booksummary' database!");
  } catch (err) {
    console.error("Error during cleanup:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

cleanup();
