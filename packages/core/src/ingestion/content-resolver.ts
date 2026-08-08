export type ContentType = "audio" | "article" | "text";

export interface ResolvedContent {
  /** Detected content type */
  type: ContentType;
  /** The original URL */
  url: string;
  /** Direct URL to audio file (if type is audio) */
  audioUrl?: string;
  /** MIME type if detected */
  mimeType?: string;
}

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma"];
const AUDIO_HOSTS = [
  "podcasts.apple.com",
  "open.spotify.com",
  "anchor.fm",
  "feeds.simplecast.com",
  "feeds.buzzsprout.com",
  "feeds.transistor.fm",
  "feed.podbean.com",
  "rss.art19.com",
  "feeds.megaphone.fm",
  "traffic.libsyn.com",
  "media.blubrry.com",
];

/**
 * Resolve a URL to determine its content type (audio, article, or raw text).
 * For audio, attempts to find the direct audio file URL.
 */
export async function resolveContent(url: string): Promise<ResolvedContent> {
  const parsed = new URL(url);
  const pathname = parsed.pathname.toLowerCase();

  // Check if URL points directly to an audio file
  if (AUDIO_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return { type: "audio", url, audioUrl: url };
  }

  // Check if URL is from a known podcast host
  if (AUDIO_HOSTS.some((host) => parsed.hostname.includes(host))) {
    const audioUrl = await resolveAudioFromPodcastUrl(url);
    return { type: "audio", url, audioUrl };
  }

  // HEAD request to check content type
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    const contentType = response.headers.get("content-type") || "";

    if (contentType.startsWith("audio/")) {
      return { type: "audio", url, audioUrl: url, mimeType: contentType };
    }

    if (contentType.includes("xml") || contentType.includes("rss")) {
      // Likely an RSS feed — try to extract audio enclosure
      const audioUrl = await resolveAudioFromRss(url);
      if (audioUrl) {
        return { type: "audio", url, audioUrl };
      }
    }

    if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
      return { type: "article", url, mimeType: contentType };
    }

    if (contentType.startsWith("text/")) {
      return { type: "text", url, mimeType: contentType };
    }

    // Default to article for unknown HTML-like content
    return { type: "article", url, mimeType: contentType };
  } catch {
    // If HEAD fails, assume article
    return { type: "article", url };
  }
}

/**
 * Attempt to resolve a direct audio URL from a podcast platform URL.
 * Falls back to the original URL if resolution fails.
 */
async function resolveAudioFromPodcastUrl(url: string): Promise<string> {
  // For RSS feed URLs, try to extract the latest episode's enclosure
  try {
    const response = await fetch(url);
    const text = await response.text();

    // Check if this is RSS/XML with enclosures
    if (text.includes("<enclosure")) {
      const match = text.match(/<enclosure[^>]+url=["']([^"']+)["']/);
      if (match) {
        return match[1];
      }
    }

    // For Apple Podcasts, try to find the stream URL in the page
    if (url.includes("podcasts.apple.com")) {
      const episodeMatch = text.match(/"assetUrl":"([^"]+)"/);
      if (episodeMatch) {
        return episodeMatch[1];
      }
    }
  } catch {
    // Fall through to return original URL
  }

  return url;
}

/**
 * Extract audio enclosure URL from an RSS feed.
 */
async function resolveAudioFromRss(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const text = await response.text();

    // Find the first (most recent) enclosure
    const match = text.match(/<enclosure[^>]+url=["']([^"']+)["']/);
    if (match) {
      return match[1];
    }
  } catch {
    // Silently fail
  }

  return null;
}
