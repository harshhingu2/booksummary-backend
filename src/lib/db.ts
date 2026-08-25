import mongoose from "mongoose";
import fs from "fs";
import bcrypt from "bcryptjs";

const globalForDb = globalThis as unknown as {
  mongooseConn?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
  adminEnsured?: boolean;
};

if (!globalForDb.mongooseConn) {
  globalForDb.mongooseConn = { conn: null, promise: null };
}

const INITIAL_CATEGORIES = [
  "Random",
  "Psychology",
  "Science",
  "Technology",
  "Business",
  "Money",
  "Philosophy",
  "History",
  "World",
  "Productivity",
  "Space",
  "Culture",
];

const INITIAL_CHANNELS = [
  { name: "Veritasium", channelId: "UCHnyfMqiRRG1u-2MsSQLbXA", category: "Science" },
  { name: "Kurzgesagt – In a Nutshell", channelId: "UCsXVk37bltHxD1rDPwtNM8Q", category: "Science" },
  { name: "TED-Ed", channelId: "UCsooa4yRKGN_zEE8iknghZA", category: "Random" },
  { name: "CrashCourse", channelId: "UCX6b17PVsYBQ0ip5gyeme-Q", category: "Random" },
  { name: "Mark Rober", channelId: "UCY1kMZp36IQSyNx_9h4mpCg", category: "Science" },
  { name: "SmarterEveryDay", channelId: "UC6107grRI4m0o2-emgoDnAA", category: "Science" },
  { name: "Vsauce", channelId: "UC6nSFpj9HTCZ5t-N3Rm3-HA", category: "Science" },
  { name: "3Blue1Brown", channelId: "UCYO_jab_esuFRV4b17AJtAw", category: "Science" },
  { name: "Numberphile", channelId: "UCoxcjq-8xIDTYp3uz647V5A", category: "Science" },
  { name: "Computerphile", channelId: "UC9-y-6csu5WGm29I7JiwpnA", category: "Technology" },
  { name: "freeCodeCamp.org", channelId: "UC8butISFwT-Wl7EV0hUK0BQ", category: "Technology" },
  { name: "Real Engineering", channelId: "UCR1IuLEqb6UEA_zQ81kwXfg", category: "Technology" },
  { name: "NileRed", channelId: "UCFhXFikryT4aFcLkLw2LBLA", category: "Science" },
  { name: "SciShow", channelId: "UCZYTClx2T1of7BRZ86-8fow", category: "Science" },
  { name: "MinuteEarth", channelId: "UCeiYXex_fwgYDonaTcSIk6w", category: "Science" },
  { name: "The Science Asylum", channelId: "UCXgNowiGxwwnLeQ7DXTwXPg", category: "Science" },
  { name: "TED", channelId: "UCAuUUnT6oDeKwE6v1NGQxug", category: "Random" },
  { name: "Big Think", channelId: "UCvQECJukTDE2i6aCoMnS-Vg", category: "Random" },
  { name: "The School of Life", channelId: "UC7IcJI8PUf5Z3zKxnZvTBog", category: "Psychology" },
  { name: "Psych2Go", channelId: "UCkJEpR3N6b7Qq7VfJg9hKqA", category: "Psychology" },
  { name: "Y Combinator", channelId: "UCcefcZRL2oaA_uBNeo5UOWg", category: "Business" },
  { name: "Investopedia", channelId: "UCvwFhI0mrIWDiZUabRapS5Q", category: "Money" },
  { name: "Khan Academy", channelId: "UC4a-Gbdw7vOaccHmFo40b9g", category: "Random" },
  { name: "MIT OpenCourseWare", channelId: "UCEBb1b_L6zDS3xTUrIALZOw", category: "Random" },
  { name: "YaleCourses", channelId: "UC4EY_qnSeAP1xGsh61eOoJA", category: "Random" },
];

async function ensureAdminAndInitialData() {
  if (globalForDb.adminEnsured) return;

  try {
    const adminEmail = process.env.ADMIN_EMAIL || "abcmailmy2019@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "AdminSecurePass!2026#DumbScroll";
    const adminName = process.env.ADMIN_NAME || "System Admin";

    // 1. Ensure Admin User
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
      console.log(`[Auto-Init] Admin account '${adminEmail}' auto-created!`);
    } else if (existingAdmin.role === "admin" || existingAdmin.role === "user") {
      existingAdmin.role = "ADMIN";
      await existingAdmin.save();
    }

    // 2. Ensure Categories Exist & Add 'Random'
    const CategorySchema = new mongoose.Schema(
      {
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
      },
      { timestamps: true, collection: "categories" }
    );

    const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema, "categories");

    for (let idx = 0; idx < INITIAL_CATEGORIES.length; idx++) {
      const catName = INITIAL_CATEGORIES[idx];
      const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      try {
        await Category.updateOne(
          { name: catName },
          { $setOnInsert: { name: catName, slug, description: `Default ${catName} category`, isActive: true, sortOrder: idx } },
          { upsert: true }
        );
      } catch (catErr) {}
    }

    try {
      const hasRandom = await Category.findOne({ name: "Random" });
      if (hasRandom) {
        await Category.deleteOne({ name: "General" });
      }
    } catch (e) {}

    // 3. Update/Ensure YouTube Channels (Syncing Channel ID, Feed URL, Channel URL without overriding category)
    const YouTubeChannelSchema = new mongoose.Schema(
      {
        channelId: { type: String, required: true, unique: true },
        channelName: { type: String, required: true },
        channelUrl: { type: String, required: true },
        feedUrl: { type: String, required: true },
        defaultCategory: { type: String, required: true, default: "Random" },
        isActive: { type: Boolean, default: true },
      },
      { timestamps: true, collection: "youtube_channels" }
    );

    const YouTubeChannel = mongoose.models.YouTubeChannel || mongoose.model("YouTubeChannel", YouTubeChannelSchema, "youtube_channels");

    for (const ch of INITIAL_CHANNELS) {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
      const channelUrl = `https://www.youtube.com/channel/${ch.channelId}`;

      // Update by channelName if exists, or insert new by channelId
      const existingByName = await YouTubeChannel.findOne({ channelName: ch.name });

      if (existingByName) {
        existingByName.channelId = ch.channelId;
        existingByName.feedUrl = feedUrl;
        existingByName.channelUrl = channelUrl;
        await existingByName.save();
      } else {
        try {
          await YouTubeChannel.updateOne(
            { channelId: ch.channelId },
            {
              $setOnInsert: {
                channelId: ch.channelId,
                channelName: ch.name,
                channelUrl,
                feedUrl,
                defaultCategory: ch.category,
                isActive: true,
              },
            },
            { upsert: true }
          );
        } catch (chErr) {}
      }
    }

    globalForDb.adminEnsured = true;
  } catch (err) {
    console.error("[Auto-Init] Failed to ensure initial data:", err);
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

  if (globalForDb.mongooseConn!.conn) {
    await ensureAdminAndInitialData();
    return globalForDb.mongooseConn!.conn;
  }

  if (!globalForDb.mongooseConn!.promise) {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    globalForDb.mongooseConn!.promise = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        bufferCommands: true,
      })
      .then((m) => m);
  }

  try {
    globalForDb.mongooseConn!.conn = await globalForDb.mongooseConn!.promise;
  } catch (e) {
    globalForDb.mongooseConn!.promise = null;
    throw e;
  }

  await ensureAdminAndInitialData();
  return globalForDb.mongooseConn!.conn;
}
