import { connectDB } from "@/lib/db";
import { YouTubeChannel, IYouTubeChannel } from "@/models/YouTubeChannel";
import { YouTubeVideo } from "@/models/YouTubeVideo";
import { fetchYouTubeFeed } from "@/services/youtube-feed";
import { isYouTubeShort } from "@/services/youtube-short-detector";

export interface IngestionStats {
  startedAt: Date;
  completedAt: Date;
  channelsChecked: number;
  successfulFeeds: number;
  failedFeeds: number;
  videosDiscovered: number;
  shortsDiscovered: number;
  duplicates: number;
  newShortsSaved: number;
  errors: string[];
}

// Helper for inter-batch delay to keep RAM and CPU low on 1GB VPS
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs the YouTube Shorts discovery & ingestion pipeline.
 * Specifically tuned for 1GB RAM VPS servers:
 * - Low concurrency limit (2 channels at a time)
 * - Checks top 5 most recent videos per channel feed
 * - 500ms sleep delay between batches to allow GC memory recovery
 */
export async function runYouTubeIngestion(): Promise<IngestionStats> {
  const startedAt = new Date();
  await connectDB();

  const stats: IngestionStats = {
    startedAt,
    completedAt: new Date(),
    channelsChecked: 0,
    successfulFeeds: 0,
    failedFeeds: 0,
    videosDiscovered: 0,
    shortsDiscovered: 0,
    duplicates: 0,
    newShortsSaved: 0,
    errors: [],
  };

  try {
    const activeChannels = await YouTubeChannel.find({ isActive: true });
    stats.channelsChecked = activeChannels.length;

    if (activeChannels.length === 0) {
      stats.completedAt = new Date();
      return stats;
    }

    // Process only 2 channels at a time for 1GB RAM protection
    const BATCH_SIZE = 2;
    const ITEMS_PER_FEED_LIMIT = 5;

    for (let i = 0; i < activeChannels.length; i += BATCH_SIZE) {
      const batch = activeChannels.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (channel: IYouTubeChannel) => {
          try {
            channel.lastFetchedAt = new Date();

            // Fetch XML feed
            const { items } = await fetchYouTubeFeed(channel.feedUrl);
            stats.successfulFeeds++;
            channel.lastSuccessfulFetchAt = new Date();
            await channel.save();

            // Limit processing to latest 5 items per channel
            const recentItems = items.slice(0, ITEMS_PER_FEED_LIMIT);
            stats.videosDiscovered += recentItems.length;

            for (const item of recentItems) {
              // Deduplication check in MongoDB
              const existingVideo = await YouTubeVideo.findOne({ videoId: item.videoId });
              if (existingVideo) {
                stats.duplicates++;
                continue;
              }

              // Shorts Detection
              const isShort = await isYouTubeShort(item.videoId);
              if (!isShort) {
                continue; // Skip non-shorts
              }

              stats.shortsDiscovered++;

              // Save new Short with status: "pending"
              await YouTubeVideo.create({
                videoId: item.videoId,
                channelId: channel.channelId,
                channelName: channel.channelName,
                title: item.title,
                thumbnailUrl: item.thumbnailUrl,
                publishedAt: item.publishedAt,
                category: channel.defaultCategory || "Random",
                source: "youtube",
                isShort: true,
                status: "pending",
              });

              stats.newShortsSaved++;
            }
          } catch (channelErr: any) {
            stats.failedFeeds++;
            const errMsg = `Channel '${channel.channelName}' (${channel.channelId}): ${channelErr.message}`;
            stats.errors.push(errMsg);
            try {
              await channel.save();
            } catch (e) {}
          }
        })
      );

      // Brief 500ms delay between batches for RAM stability
      if (i + BATCH_SIZE < activeChannels.length) {
        await sleep(500);
      }
    }
  } catch (err: any) {
    stats.errors.push(`Ingestion Pipeline Error: ${err.message}`);
  }

  stats.completedAt = new Date();
  return stats;
}
