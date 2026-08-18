import { extractVideoId, isYouTubeUrl } from "./youtube.js";

export interface CanonicalSource {
  /** Stable URL identity, not a content hash. */
  id: string;
  /** Normalized public URL used for attribution and re-ingest. */
  url: string;
  /** Hostname without www, useful for existing domain views. */
  domain: string;
}

/** Canonical form for cache keys — strip trackers, normalize YouTube. */
export function normalizeSourceUrl(url: string): string {
  try {
    if (isYouTubeUrl(url)) {
      const id = extractVideoId(url);
      return id ? `https://www.youtube.com/watch?v=${id}` : url.trim();
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

/** Return a normalized public URL, or null for need:// and malformed inputs. */
export function canonicalPublicSourceUrl(url: string): string | null {
  const normalized = normalizeSourceUrl(url);
  try {
    const parsed = new URL(normalized);
    if (parsed.hostname === "fondof.local" || parsed.hostname === "localhost") {
      return null;
    }
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? normalized
      : null;
  } catch {
    return null;
  }
}

/**
 * Stable identity for a public source URL. This identifies the source URL;
 * source content commitments remain separate in sourceHashes.
 */
export async function canonicalSourceId(url: string): Promise<string | null> {
  const canonical = canonicalPublicSourceUrl(url);
  if (!canonical) return null;

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `src_${hex.slice(0, 32)}`;
}

/** Build de-duplicated canonical identities in source order. */
export async function canonicalSources(
  urls: readonly string[],
): Promise<CanonicalSource[]> {
  const out: CanonicalSource[] = [];
  const seen = new Set<string>();
  for (const rawUrl of urls) {
    const url = canonicalPublicSourceUrl(rawUrl);
    if (!url || seen.has(url)) continue;
    const id = await canonicalSourceId(url);
    if (!id) continue;
    seen.add(url);
    out.push({
      id,
      url,
      domain: new URL(url).hostname.replace(/^www\./, ""),
    });
  }
  return out;
}

export function ingestCacheTtl(contentType: string): number {
  if (contentType === "youtube" || contentType === "podcast" || contentType === "audio") {
    return 60 * 60 * 24 * 7; // 7d — transcripts are stable
  }
  return 60 * 60 * 24; // 1d articles
}
