import mongoose from 'mongoose';
import fs from 'fs';

try {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  }
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI;

async function listDbs() {
  try {
    await mongoose.connect(MONGODB_URI);
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    console.log("Databases on server:", dbs.databases.map(d => d.name));

    for (const d of dbs.databases) {
      if (['admin', 'config', 'local'].includes(d.name)) continue;
      const conn = mongoose.connection.useDb(d.name);
      const collections = await conn.db.listCollections().toArray();
      console.log(`Database '${d.name}' collections:`, collections.map(c => c.name));
      for (const col of collections) {
        const count = await conn.db.collection(col.name).countDocuments();
        console.log(`  -> '${d.name}.${col.name}': ${count} docs`);
        const sample = await conn.db.collection(col.name).findOne();
        console.log(`     Sample:`, JSON.stringify(sample).slice(0, 200));
      }
    }
  } catch (err) {
    console.error("Error listing databases:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

listDbs();
