/**
 * YouTube transcript extraction.
 * Extracts captions/subtitles from YouTube videos without needing the Data API.
 */

/**
 * Check if a URL is a YouTube video.
 */
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/.test(url);
}

/**
 * Extract video ID from a YouTube URL.
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch transcript from YouTube.
 * Tries: direct page scrape → Firecrawl (renders JS) → timedtext API.
 */
export async function getYouTubeTranscript(
  url: string,
  firecrawlKey?: string
): Promise<{ text: string; title: string } | null> {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  // Method 1: Try timedtext API (most reliable from Workers)
  const timedText = await fetchTimedText(videoId, "");
  if (timedText) return timedText;

  // Method 2: Try Firecrawl to render the page and get captions
  if (firecrawlKey) {
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          formats: ["markdown"],
          onlyMainContent: true,
          timeout: 25000,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          success: boolean;
          data?: { markdown?: string; metadata?: { title?: string } };
        };

        if (data.success && data.data?.markdown && data.data.markdown.length > 200) {
          return {
            text: data.data.markdown,
            title: data.data.metadata?.title ?? `YouTube: ${videoId}`,
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  // Method 3: Direct page fetch (may be blocked from Worker IPs)
  try {
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const html = await pageResponse.text();
    const titleMatch = html.match(/"title":"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : `YouTube: ${videoId}`;

    const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (captionsMatch) {
      const captionTracks = JSON.parse(captionsMatch[1]) as Array<{
        baseUrl: string;
        languageCode: string;
      }>;

      const englishTrack = captionTracks.find((t) => t.languageCode.startsWith("en"));
      const track = englishTrack ?? captionTracks[0];

      if (track) {
        const captionUrl = track.baseUrl.replace(/\\u0026/g, "&");
        const captionResponse = await fetch(captionUrl);
        const captionXml = await captionResponse.text();
        const text = parseYouTubeCaptions(captionXml);
        if (text) return { text, title };
      }
    }
  } catch {
    // All methods failed
  }

  return null;
}

/**
 * Fallback: try YouTube's timedtext API directly.
 */
async function fetchTimedText(videoId: string, title: string): Promise<{ text: string; title: string } | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      events?: Array<{ segs?: Array<{ utf8: string }> }>;
    };

    if (!data.events) return null;

    const text = data.events
      .flatMap((e) => e.segs?.map((s) => s.utf8) ?? [])
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return text.length > 50 ? { text, title } : null;
  } catch {
    return null;
  }
}

/**
 * Parse YouTube caption XML format into plain text.
 */
function parseYouTubeCaptions(xml: string): string | null {
  // YouTube captions are in format: <text start="0" dur="5.2">caption text</text>
  const segments: string[] = [];
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (text) segments.push(text);
  }

  const fullText = segments.join(" ").replace(/\s+/g, " ").trim();
  return fullText.length > 50 ? fullText : null;
}
