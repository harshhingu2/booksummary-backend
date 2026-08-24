/**
 * Service to detect if a YouTube video ID is a Short.
 * 
 * Uses a multi-tiered approach:
 * 1. Direct HTTP request to https://www.youtube.com/shorts/{videoId} (verifying redirect & status).
 * 2. Optional YouTube Data API fallback if YOUTUBE_API_KEY is configured.
 */
export async function isYouTubeShort(videoId: string): Promise<boolean> {
  if (!videoId) return false;

  // Method 1: Lightweight HTTP check to shorts URL
  try {
    const shortsUrl = `https://www.youtube.com/shorts/${videoId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(shortsUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeoutId);

    // If status is 200 OK, or redirect location stays on /shorts/{videoId}, it IS a Short!
    if (response.status === 200) {
      const html = await response.text();
      // Verify metadata tags or canonical link indicating a Short
      if (
        html.includes(`"canonical" href="https://www.youtube.com/shorts/${videoId}"`) ||
        html.includes(`"videoDetails"`) ||
        html.includes(`shorts/${videoId}`) ||
        !html.includes(`"isShort":false`)
      ) {
        return true;
      }
    }

    // If response status is 302/303 redirecting away to /watch?v=videoId, it is NOT a Short
    const location = response.headers.get("location");
    if (location && location.includes("/watch?v=")) {
      return false;
    }
  } catch (err) {
    // Continue to Method 2 if HTTP check fails/times out
  }

  // Method 2: Optional YouTube Data API check if API Key is configured
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const data = await apiRes.json();
        const item = data.items?.[0];
        if (item?.contentDetails?.duration) {
          const durationISO = item.contentDetails.duration; // e.g. PT45S or PT1M2S
          // Shorts are under 60 seconds (PT59S or PT1M0S)
          const matchMinutes = durationISO.match(/(\d+)M/);
          const matchSeconds = durationISO.match(/(\d+)S/);
          const minutes = matchMinutes ? parseInt(matchMinutes[1], 10) : 0;
          const seconds = matchSeconds ? parseInt(matchSeconds[1], 10) : 0;
          const totalSeconds = minutes * 60 + seconds;
          return totalSeconds <= 60;
        }
      }
    } catch (e) {
      // Ignore API errors
    }
  }

  // Default fallback: Default to true if method 1 gave status 200
  return false;
}
