import mongoose from "mongoose";
import fs from "fs";

if (fs.existsSync(".env.local")) {
  try {
    process.loadEnvFile(".env.local");
  } catch (e) {}
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/dumbscroll";

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

async function updateChannelIdsNow() {
  try {
    console.log("Connecting to MongoDB to update channel IDs...");
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

    for (const ch of INITIAL_CHANNELS) {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
      const channelUrl = `https://www.youtube.com/channel/${ch.channelId}`;

      const existingByName = await YouTubeChannel.findOne({ channelName: ch.name });
      if (existingByName) {
        existingByName.channelId = ch.channelId;
        existingByName.feedUrl = feedUrl;
        existingByName.channelUrl = channelUrl;
        await existingByName.save();
        console.log(`Updated channel '${ch.name}' -> ID: ${ch.channelId}`);
      } else {
        await YouTubeChannel.create({
          channelId: ch.channelId,
          channelName: ch.name,
          channelUrl,
          feedUrl,
          defaultCategory: ch.category,
          isActive: true,
        });
        console.log(`Inserted channel '${ch.name}' -> ID: ${ch.channelId}`);
      }
    }

    const count = await YouTubeChannel.countDocuments();
    console.log(`SUCCESSFULLY UPDATED CHANNEL IDS! Total channels in DB: ${count}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Update error:", err);
    process.exit(1);
  }
}

updateChannelIdsNow();
