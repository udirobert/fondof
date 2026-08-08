import { extractVideoId, isYouTubeUrl } from "./youtube.js";

/** Canonical form for cache keys — strip trackers, normalize YouTube. */
export function normalizeSourceUrl(url: string): string {
  try {
    if (isYouTubeUrl(url)) {
      const id = extractVideoId(url);
      return id ? `https://www.youtube.com/watch?v=${id}` : url;
    }

    const u = new URL(url);
    u.hash = "";
    for (const p of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "gclid",
      "mc_cid",
      "mc_eid",
      "t",
    ]) {
      u.searchParams.delete(p);
    }
    // stable param order
    u.searchParams.sort();
    return u.toString();
  } catch {
    return url.trim();
  }
}

export function ingestCacheTtl(contentType: string): number {
  if (contentType === "youtube" || contentType === "podcast" || contentType === "audio") {
    return 60 * 60 * 24 * 7; // 7d — transcripts are stable
  }
  return 60 * 60 * 24; // 1d articles
}
