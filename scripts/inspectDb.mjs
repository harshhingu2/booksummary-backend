import mongoose from 'mongoose';
import fs from 'fs';

try {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  }
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI;

async function inspect() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("Existing collections in DB:", collections.map(c => c.name));
    
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`Collection '${col.name}': ${count} documents`);
      const sample = await db.collection(col.name).findOne();
      console.log(`Sample doc in '${col.name}':`, JSON.stringify(sample, null, 2));
    }
  } catch (err) {
    console.error("Error inspecting DB:", err);
  } finally {
    await mongoose.disconnect();
  }
}

inspect();
