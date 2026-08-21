/**
 * YouTube transcript extraction.
 * Extracts captions/subtitles from YouTube videos without needing the Data API.
 *
 * Strategy:
 *  1. Fetch the watch page once — gives us the title AND the captionTracks list.
 *  2. Try the timedtext API with lang fallbacks (en → en-US → auto/ASR).
 *  3. Walk the ranked captionTracks (manual en → a.en/ASR en → any manual → any)
 *     and parse each track's baseUrl XML with the existing parser.
 *  4. Firecrawl as a last resort.
 */

import { safeFetch } from "./ssrf.js";

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

export type YoutubeProvider = "timedtext" | "firecrawl" | "page";

/** A single entry from the watch page's captionTracks array. */
export interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
  /** e.g. ".en" (manual) or "a.en" (auto-generated/ASR) */
  vssId?: string;
  /** "asr" for auto-generated captions */
  kind?: string;
  isTranslatable?: boolean;
}

/**
 * Fetch transcript from YouTube.
 * Tries: timedtext API → watch-page captionTracks (en → a.en/ASR → any) → Firecrawl.
 *
 * Optional KV (e.g. SESSIONS) caches the winning transcript per videoId so
 * re-ingests never re-burn Firecrawl / page fetches after Cache API eviction.
 */
export async function getYouTubeTranscript(
  url: string,
  firecrawlKey?: string,
  kv?: KVNamespace,
): Promise<{ text: string; title: string; provider: YoutubeProvider } | null> {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  if (kv) {
    const cached = await captionCacheGet(kv, videoId);
    if (cached) return cached;
  }

  const result = await fetchYouTubeTranscript(videoId, firecrawlKey);

  if (result && kv) {
    await captionCachePut(kv, videoId, result);
  }

  return result;
}

const CAPTION_TTL = 60 * 60 * 24 * 7; // 7d — transcripts are stable
const CAPTION_TEXT_CAP = 200_000;

type CachedCaption = {
  text: string;
  title: string;
  provider: YoutubeProvider;
};

function captionCacheKey(videoId: string) {
  return `yt-caption:v1:${videoId}`;
}

async function captionCacheGet(
  kv: KVNamespace,
  videoId: string,
): Promise<CachedCaption | null> {
  try {
    const rec = (await kv.get(captionCacheKey(videoId), "json")) as
      | (CachedCaption & { at?: number })
      | null;
    if (rec && typeof rec.text === "string" && rec.text.length > 50) {
      const { at: _at, ...rest } = rec;
      return rest as CachedCaption;
    }
    return null;
  } catch {
    return null;
  }
}

async function captionCachePut(
  kv: KVNamespace,
  videoId: string,
  result: CachedCaption,
): Promise<void> {
  try {
    await kv.put(
      captionCacheKey(videoId),
      JSON.stringify({ ...result, text: result.text.slice(0, CAPTION_TEXT_CAP), at: Date.now() }),
      { expirationTtl: CAPTION_TTL },
    );
  } catch {
    /* non-fatal */
  }
}

async function fetchYouTubeTranscript(
  videoId: string,
  firecrawlKey?: string,
): Promise<{ text: string; title: string; provider: YoutubeProvider } | null> {

  // Backbone: watch page gives us the real title + the full track list
  const page = await fetchWatchPage(videoId);
  const title = page?.title || `YouTube: ${videoId}`;

  // Method 1: timedtext API, lang fallbacks (en → en-US → ASR)
  const timedText = await fetchTimedTextBest(videoId);
  if (timedText) return { text: timedText, title, provider: "timedtext" };

  // Method 2: ranked captionTracks → baseUrl XML → existing parser
  if (page?.captionTracks?.length) {
    for (const track of rankCaptionTracks(page.captionTracks)) {
      const text = await fetchTrackXml(track.baseUrl);
      if (text) return { text, title, provider: "page" };
    }
  }

  // Method 3: Firecrawl renders the page and returns markdown
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
            title: data.data.metadata?.title ?? title,
            provider: "firecrawl",
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  return null;
}

interface WatchPage {
  title: string | null;
  captionTracks: CaptionTrack[];
}

/**
 * Fetch the watch page and pull out the title + captionTracks.
 * Returns null only if the fetch itself fails.
 */
async function fetchWatchPage(videoId: string): Promise<WatchPage | null> {
  try {
    const fetched = await safeFetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: "SOCS=CAI; CONSENT=YES+cb",
        },
      },
    );
    if (!fetched.ok) return null;
    const html = fetched.body;
    return {
      title: extractTitle(html) ?? `YouTube: ${videoId}`,
      captionTracks: extractCaptionTracks(html),
    };
  } catch {
    return null;
  }
}

/**
 * Extract the page title. Tries videoDetails JSON first, then generic fields.
 */
export function extractTitle(html: string): string | null {
  const videoDetails = html.match(/"videoDetails":\{[^}]*?"title":"((?:[^"\\]|\\.)*)"/);
  if (videoDetails) return decodeJsonString(videoDetails[1]);

  const ogTitle = html.match(/<meta\s+(?:name|property)="(?:og:)?title"\s+content="([^"]+)"/);
  if (ogTitle) return decodeJsonString(ogTitle[1]);

  const generic = html.match(/"title":"((?:[^"\\]|\\.)*)"/);
  if (generic) return decodeJsonString(generic[1]);

  return null;
}

function decodeJsonString(s: string): string {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
}

/**
 * Extract the full captionTracks array from the watch page HTML.
 *
 * The naive regex `"captionTracks":\s*(\[.*?\])` stops at the first `]`,
 * which breaks when a track name uses the `runs` form (`"runs":[{"text":…}]`).
 * Bracket matching handles arbitrary nesting.
 */
export function extractCaptionTracks(html: string): CaptionTrack[] {
  const key = '"captionTracks":';
  const keyIdx = html.indexOf(key);
  if (keyIdx === -1) return [];

  const start = html.indexOf("[", keyIdx + key.length);
  if (start === -1) return [];

  let depth = 0;
  let end = -1;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "[" || ch === "{") {
      depth++;
    } else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) return [];

  try {
    const parsed = JSON.parse(html.slice(start, end + 1)) as CaptionTrack[];
    return Array.isArray(parsed) ? parsed.filter((t) => !!t?.baseUrl) : [];
  } catch {
    return [];
  }
}

function isEnglishTrack(t: CaptionTrack): boolean {
  const lang = (t.languageCode ?? "").toLowerCase();
  const vss = (t.vssId ?? "").toLowerCase();
  return lang.startsWith("en") || vss.endsWith(".en");
}

function isAsrTrack(t: CaptionTrack): boolean {
  return t.kind === "asr" || (t.vssId ?? "").toLowerCase().startsWith("a.");
}

/**
 * Rank tracks: manual en → a.en/ASR en → any manual → any ASR.
 * Stable sort keeps YouTube's own order inside each tier.
 */
export function rankCaptionTracks(tracks: CaptionTrack[]): CaptionTrack[] {
  const score = (t: CaptionTrack): number =>
    (isEnglishTrack(t) ? 4 : 0) + (isAsrTrack(t) ? 0 : 2);
  return [...tracks].sort((a, b) => score(b) - score(a));
}

/**
 * Fetch a caption track's baseUrl and run it through the XML parser.
 */
async function fetchTrackXml(baseUrl: string): Promise<string | null> {
  try {
    const cleanUrl = baseUrl.replace(/\\u0026/g, "&");
    const fetched = await safeFetch(cleanUrl, {
      headers: {
        Referer: "https://www.youtube.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!fetched.ok) return null;
    return parseYouTubeCaptions(fetched.body);
  } catch {
    return null;
  }
}

/**
 * Timedtext API with lang fallbacks: en → en-US → auto (kind=asr).
 */
async function fetchTimedTextBest(videoId: string): Promise<string | null> {
  const attempts: Array<{ lang: string; kind?: string }> = [
    { lang: "en" },
    { lang: "en-US" },
    { lang: "en", kind: "asr" },
    { lang: "en-US", kind: "asr" },
  ];

  for (const { lang, kind } of attempts) {
    const text = await fetchTimedTextFormat(videoId, lang, kind);
    if (text) return text;
  }
  return null;
}

async function fetchTimedTextFormat(
  videoId: string,
  lang: string,
  kind?: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({ v: videoId, lang, fmt: "json3" });
    if (kind) params.set("kind", kind);

    const fetched = await safeFetch(
      `https://www.youtube.com/api/timedtext?${params}`,
    );
    if (!fetched.ok) return null;

    const data = JSON.parse(fetched.body) as {
      events?: Array<{ segs?: Array<{ utf8: string }> }>;
    };
    if (!data.events) return null;

    const text = data.events
      .flatMap((e) => e.segs?.map((s) => s.utf8) ?? [])
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Parse YouTube caption XML format into plain text.
 */
export function parseYouTubeCaptions(xml: string): string | null {
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
