import { Hono } from "hono";
import type { Env } from "../index.js";
import { chat, embed } from "../lib/llm.js";
import { extractContent } from "../lib/extract.js";
import { transcribeAudio, isAudioUrl, resolveAudioUrl } from "../lib/transcribe.js";
import { isYouTubeUrl, getYouTubeTranscript } from "../lib/youtube.js";
import { isRssUrl, getLatestEpisodeFromRss } from "../lib/rss.js";
import { cacheGetJson, cachePutJson, sha256Hex } from "../lib/edge-cache.js";
import { ingestCacheTtl, normalizeSourceUrl } from "../lib/source-url.js";
import { rateLimit } from "../lib/rate-limit-mw.js";

const EXTRACT_SYSTEM = `You are a JSON-only response bot. You extract actionable technical ideas from content.

IMPORTANT: You MUST respond with ONLY a valid JSON array. No explanations, no markdown, no code fences. Just the raw JSON array.

Each idea in the array must have: title (string), description (string), domain (array of strings), applicability (array of strings), patternType (one of: "technique", "mental-model", "anti-pattern", "architecture").

Example response:
[{"title":"Error Boundaries","description":"Use catchError for custom error handling that does not interfere with routing.","domain":["error-handling"],"applicability":["react","next.js"],"patternType":"technique"}]`;

export type IngestContentType = "audio" | "article" | "youtube" | "podcast";

export type IngestStreamEvent =
  | {
      type: "kind";
      contentType: IngestContentType;
      fondObject: string;
    }
  | { type: "phase"; phase: string; label: string }
  | { type: "meta"; title: string }
  | {
      type: "idea";
      idea: IdeaOutput;
    }
  | {
      type: "done";
      sourceHash: string;
      contentType: IngestContentType;
      title: string;
      textLength: number;
      ideaCount: number;
    }
  | {
      type: "discovery";
      existingSkills: Array<{ title: string; url: string; snippet: string }>;
    }
  | { type: "error"; error: string };

interface IdeaOutput {
  id: string;
  title: string;
  description: string;
  domain: string[];
  applicability: string[];
  patternType: string;
  sourceUrl: string;
  sourceHash: string;
  embedding: number[];
}

type IngestResult = {
  contentType: IngestContentType;
  sourceHash: string;
  title: string;
  ideas: IdeaOutput[];
  textLength: number;
  existingSkills: Array<{ title: string; url: string; snippet: string }>;
  cacheHit?: boolean;
};

type Emit = (event: IngestStreamEvent) => void;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Cache hits still play the story — short beats so examples feel intentional,
 * not instant teleport.
 */
async function replayCachedIngest(cached: IngestResult, emit: Emit) {
  emit({
    type: "kind",
    contentType: cached.contentType,
    fondObject: fondObjectFor(cached.contentType),
  });
  await sleep(320);

  emit({
    type: "phase",
    phase: "resolve",
    label: "Recognizing the source…",
  });
  await sleep(480);
  emit({ type: "meta", title: cached.title });

  const materialPhase =
    cached.contentType === "youtube"
      ? { phase: "captions", label: "Replaying captions…" }
      : cached.contentType === "podcast" || cached.contentType === "audio"
        ? { phase: "transcribe", label: "Replaying the transcript…" }
        : { phase: "read", label: "Replaying the piece…" };
  emit({ type: "phase", ...materialPhase });
  await sleep(520);

  emit({
    type: "phase",
    phase: "extract",
    label: "Settling discrete ideas…",
  });
  await sleep(400);

  for (const idea of cached.ideas) {
    emit({ type: "idea", idea });
    await sleep(240);
  }

  if (cached.existingSkills?.length) {
    emit({
      type: "phase",
      phase: "discover",
      label: "Checking what already exists…",
    });
    await sleep(380);
    emit({
      type: "discovery",
      existingSkills: cached.existingSkills.slice(0, 3),
    });
  }

  await sleep(220);
  emit({
    type: "done",
    sourceHash: cached.sourceHash,
    contentType: cached.contentType,
    title: cached.title,
    textLength: cached.textLength,
    ideaCount: cached.ideas.length,
  });
}

function fondObjectFor(contentType: IngestContentType): string {
  switch (contentType) {
    case "youtube":
      return "the talk";
    case "podcast":
    case "audio":
      return "the pod";
    case "article":
      return "the piece";
  }
}

async function runIngestPipeline(
  url: string,
  env: Env,
  emit: Emit,
): Promise<IngestResult> {
  const canonical = normalizeSourceUrl(url);
  const cacheKey = `ingest:v1:${await sha256Hex(canonical)}`;
  const cached = await cacheGetJson<IngestResult>(cacheKey);
  if (cached?.ideas?.length) {
    await replayCachedIngest(cached, emit);
    return { ...cached, cacheHit: true };
  }

  let text: string;
  let title: string;
  let contentType: IngestContentType;

  emit({ type: "phase", phase: "resolve", label: "Reading the link…" });

  if (isYouTubeUrl(canonical)) {
    contentType = "youtube";
    emit({
      type: "kind",
      contentType,
      fondObject: fondObjectFor(contentType),
    });
    emit({
      type: "phase",
      phase: "captions",
      label: "Fetching captions…",
    });
    const transcript = await getYouTubeTranscript(
      canonical,
      env.FIRECRAWL_API_KEY,
    );

    if (!transcript || !transcript.text) {
      throw new Error(
        "Could not extract transcript from YouTube video. The video may not have captions.",
      );
    }

    text = transcript.text;
    title = transcript.title;
    emit({ type: "meta", title });
  } else if (isRssUrl(canonical)) {
    contentType = "podcast";
    emit({
      type: "kind",
      contentType,
      fondObject: fondObjectFor(contentType),
    });
    emit({
      type: "phase",
      phase: "resolve_feed",
      label: "Opening the feed…",
    });
    const episode = await getLatestEpisodeFromRss(canonical);

    if (!episode) {
      throw new Error(
        "Could not parse RSS feed. Make sure the URL points to a valid podcast RSS feed.",
      );
    }

    emit({ type: "meta", title: episode.title });
    emit({
      type: "phase",
      phase: "transcribe",
      label: "Transcribing episode…",
    });
    const transcript = await transcribeAudio(episode.audioUrl, env);
    if (!transcript || !transcript.text) {
      if (episode.description && episode.description.length > 100) {
        text = episode.description;
      } else {
        throw new Error(
          `Found episode "${episode.title}" but could not transcribe audio. ElevenLabs API key may be missing or the audio URL is inaccessible.`,
        );
      }
    } else {
      text = transcript.text;
    }

    title = episode.title;
  } else if (isAudioUrl(canonical)) {
    contentType = "audio";
    emit({
      type: "kind",
      contentType,
      fondObject: fondObjectFor(contentType),
    });
    emit({
      type: "phase",
      phase: "transcribe",
      label: "Transcribing audio…",
    });
    const audioUrl = (await resolveAudioUrl(canonical)) ?? canonical;
    const transcript = await transcribeAudio(audioUrl, env);

    if (!transcript || !transcript.text) {
      throw new Error(
        "Could not transcribe audio. Check the URL or ElevenLabs API key.",
      );
    }

    text = transcript.text;
    title = canonical.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Podcast";
    emit({ type: "meta", title });
  } else {
    contentType = "article";
    emit({
      type: "kind",
      contentType,
      fondObject: fondObjectFor(contentType),
    });
    emit({ type: "phase", phase: "read", label: "Reading the page…" });
    const extracted = await extractContent(canonical, env);

    if (!extracted) {
      throw new Error("Could not extract content from URL");
    }

    text = extracted.text;
    title = extracted.title || new URL(canonical).hostname;
    emit({ type: "meta", title });
  }

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  const sourceHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  emit({
    type: "phase",
    phase: "extract",
    label: "Pulling discrete ideas…",
  });

  const truncated = text.slice(0, 12000);
  const llmResponse = await chat(
    env.AI,
    EXTRACT_SYSTEM,
    `Extract all actionable technical ideas from this content. Respond with ONLY a JSON array:\n\n${truncated}`,
    env,
  );

  const responseStr =
    typeof llmResponse === "string" ? llmResponse : JSON.stringify(llmResponse);
  const ideas = parseIdeas(responseStr, canonical, sourceHash);

  emit({ type: "phase", phase: "embed", label: "Settling shards…" });

  if (ideas.length > 0) {
    const texts = ideas.map((i) => `${i.title}: ${i.description}`);
    const embeddings = await embed(env.AI, texts);
    ideas.forEach((idea, i) => {
      idea.embedding = embeddings[i] ?? [];
    });
  }

  for (const idea of ideas) {
    emit({ type: "idea", idea });
  }

  // Discovery: search for existing skills that cover these ideas
  let existingSkills: Array<{ title: string; url: string; snippet: string }> = [];
  if (env.EXA_API_KEY && ideas.length > 0) {
    emit({ type: "phase", phase: "discover", label: "Checking what already exists…" });
    try {
      const { searchExistingSkills } = await import("../lib/search.js");
      const query = ideas.slice(0, 3).map((i) => i.title).join(", ");
      existingSkills = await searchExistingSkills(query, env);
      if (existingSkills.length > 0) {
        emit({
          type: "discovery",
          existingSkills: existingSkills.slice(0, 3),
        } as IngestStreamEvent);
      }
    } catch {
      // Non-fatal
    }
  }

  emit({
    type: "done",
    sourceHash,
    contentType,
    title,
    textLength: text.length,
    ideaCount: ideas.length,
  });

  const result: IngestResult = {
    contentType,
    sourceHash,
    title,
    ideas,
    textLength: text.length,
    existingSkills,
    cacheHit: false,
  };

  if (ideas.length > 0) {
    // Strip heavy embeddings from cache payload
    const toStore: IngestResult = {
      ...result,
      ideas: ideas.map((i) => ({ ...i, embedding: [] })),
    };
    await cachePutJson(cacheKey, toStore, ingestCacheTtl(contentType));
  }

  return result;
}

export const ingestRoute = new Hono<{ Bindings: Env }>();

/** NDJSON stream of ingest progress for the Fond Floor theater. */
ingestRoute.post("/ingest/stream", rateLimit("ingest"), async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  if (!url) {
    return c.json({ error: "url is required" }, 400);
  }

  const canonical = normalizeSourceUrl(url);
  const peek = await cacheGetJson<IngestResult>(
    `ingest:v1:${await sha256Hex(canonical)}`,
  );
  const cacheStatus = peek?.ideas?.length ? "HIT" : "MISS";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: IngestStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await runIngestPipeline(url, c.env, send);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        send({ type: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return c.newResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Cache": cacheStatus,
    },
  });
});

ingestRoute.post("/ingest", rateLimit("ingest"), async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  if (!url) return c.json({ error: "url is required" }, 400);

  try {
    const result = await runIngestPipeline(url, c.env, () => {});
    c.header("X-Cache", result.cacheHit ? "HIT" : "MISS");
    return c.json({
      contentType: result.contentType,
      sourceHash: result.sourceHash,
      title: result.title,
      ideas: result.ideas,
      textLength: result.textLength,
      existingSkills: result.existingSkills,
      cached: !!result.cacheHit,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

function parseIdeas(
  response: string,
  sourceUrl: string,
  sourceHash: string,
): IdeaOutput[] {
  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1] : response.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        parsed = JSON.parse(arrMatch[0]);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item: Record<string, unknown>) => item.title && item.description)
    .map((item: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      title: item.title as string,
      description: item.description as string,
      domain: (item.domain as string[]) ?? [],
      applicability: (item.applicability as string[]) ?? [],
      patternType: (item.patternType as string) ?? "technique",
      sourceUrl,
      sourceHash,
      embedding: [],
    }));
}
