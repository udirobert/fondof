/**
 * RSS feed parsing for podcast episode audio extraction.
 * Given an RSS feed URL, extracts the latest episode's audio file URL and title.
 */

export interface RssEpisode {
  title: string;
  audioUrl: string;
  description?: string;
  publishedDate?: string;
}

/**
 * Check if a URL looks like an RSS/XML feed.
 */
export function isRssUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("/feed") ||
    lower.includes("/rss") ||
    lower.endsWith(".xml") ||
    lower.includes("feeds.") ||
    lower.includes("anchor.fm/s/") ||
    lower.includes("feeds.simplecast.com") ||
    lower.includes("feeds.buzzsprout.com") ||
    lower.includes("feeds.transistor.fm") ||
    lower.includes("feeds.megaphone.fm") ||
    lower.includes("rss.art19.com") ||
    lower.includes("feed.podbean.com")
  );
}

/**
 * Parse an RSS feed and extract the latest episode's audio URL.
 */
export async function getLatestEpisodeFromRss(feedUrl: string): Promise<RssEpisode | null> {
  try {
    const response = await fetch(feedUrl, {
      headers: { "User-Agent": "fondof/0.1 (podcast skill forge)" },
    });

    if (!response.ok) return null;

    const xml = await response.text();

    // Check if it's actually XML/RSS
    if (!xml.includes("<rss") && !xml.includes("<feed") && !xml.includes("<enclosure")) {
      return null;
    }

    // Extract first (latest) enclosure URL
    const enclosureMatch = xml.match(/<enclosure[^>]+url=["']([^"']+)["']/);
    if (!enclosureMatch) return null;

    const audioUrl = enclosureMatch[1];

    // Extract episode title (first <title> inside an <item>)
    const itemMatch = xml.match(/<item[\s\S]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const title = itemMatch ? itemMatch[1].trim() : "Latest Episode";

    // Extract description
    const descMatch = xml.match(/<item[\s\S]*?<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 200) : undefined;

    return { title, audioUrl, description };
  } catch {
    return null;
  }
}
