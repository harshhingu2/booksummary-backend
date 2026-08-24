import { XMLParser } from "fast-xml-parser";

export interface FeedVideoItem {
  videoId: string;
  title: string;
  publishedAt: Date;
  thumbnailUrl: string;
}

export interface ResolvedChannelInfo {
  channelId: string;
  channelName: string;
  feedUrl: string;
}

/**
 * Resolves any YouTube Channel URL (/@handle, /channel/UC..., /c/name, /user/name)
 * into a canonical Channel ID, Channel Name, and XML Feed URL.
 */
export async function resolveYouTubeChannel(urlInput: string): Promise<ResolvedChannelInfo> {
  const cleanUrl = urlInput.trim();

  // 1. Direct channel ID pattern check (/channel/UC...)
  const channelIdMatch = cleanUrl.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/i);
  if (channelIdMatch) {
    const channelId = channelIdMatch[1];
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    
    try {
      const feedItems = await fetchYouTubeFeed(feedUrl);
      return {
        channelId,
        channelName: feedItems.channelName || `Channel ${channelId}`,
        feedUrl,
      };
    } catch (e) {
      return {
        channelId,
        channelName: `Channel ${channelId}`,
        feedUrl,
      };
    }
  }

  // 2. Fetch page content or handle redirect to resolve channel ID
  let normalizedUrl = cleanUrl;
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = `https://${normalizedUrl.replace(/^\/+/, "")}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeoutId);

    const html = await response.text();

    // RegEx patterns for channelId in YouTube HTML meta tags / canonical link
    const idMatches = [
      html.match(/meta itemProp="identifier" content="(UC[a-zA-Z0-9_-]+)"/i),
      html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/i),
      html.match(/meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)"/i),
      html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)">/i),
    ];

    let foundChannelId: string | null = null;
    for (const match of idMatches) {
      if (match && match[1]) {
        foundChannelId = match[1];
        break;
      }
    }

    // RegEx pattern for channel title
    const titleMatch =
      html.match(/meta property="og:title" content="([^"]+)"/i) ||
      html.match(/<title>([^<]+)<\/title>/i);

    let channelName = titleMatch ? titleMatch[1].replace(/ - YouTube$/, "").trim() : "YouTube Channel";

    if (!foundChannelId) {
      throw new Error(`Could not resolve YouTube Channel ID from URL: ${urlInput}`);
    }

    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${foundChannelId}`;

    return {
      channelId: foundChannelId,
      channelName,
      feedUrl,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`Failed to resolve channel URL '${urlInput}': ${error.message}`);
  }
}

/**
 * Fetches and parses a YouTube RSS XML feed.
 */
export async function fetchYouTubeFeed(feedUrl: string): Promise<{ channelName: string; items: FeedVideoItem[] }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const xmlData = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(xmlData);

    const feed = parsed.feed;
    if (!feed) {
      return { channelName: "", items: [] };
    }

    const channelName = feed.title || "";
    let entries = feed.entry || [];
    if (!Array.isArray(entries)) {
      entries = [entries];
    }

    const items: FeedVideoItem[] = entries.map((entry: any) => {
      const videoId = entry["yt:videoId"] || entry.id?.replace("yt:video:", "") || "";
      const title = entry.title || "";
      const publishedAt = new Date(entry.published || entry.updated || Date.now());

      let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      if (entry["media:group"] && entry["media:group"]["media:thumbnail"]) {
        const thumbObj = entry["media:group"]["media:thumbnail"];
        thumbnailUrl = thumbObj["@_url"] || thumbnailUrl;
      }

      return {
        videoId,
        title,
        publishedAt,
        thumbnailUrl,
      };
    }).filter((item: FeedVideoItem) => Boolean(item.videoId));

    return { channelName, items };
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`Feed fetch error for ${feedUrl}: ${error.message}`);
  }
}
