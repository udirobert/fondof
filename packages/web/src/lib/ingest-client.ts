import {
  ingestURL,
  ingestURLStream,
  type IdeaFromAPI,
  type IngestStreamEvent,
} from "@/lib/api";
import {
  hostnameTitle,
  seededIngestIdeas,
  seededNeedIdeas,
  type DemoIdea,
  type DemoSource,
} from "@/lib/demo-data";

function mapApiIdea(idea: IdeaFromAPI, index: number): DemoIdea {
  const score = Math.min(0.95, 0.55 + idea.description.length / 400);
  const worthiness: DemoIdea["worthiness"] =
    score > 0.75 ? "forge-skill" : score > 0.45 ? "apply-directly" : "skip";
  const matchType: DemoIdea["matchType"] =
    worthiness === "forge-skill"
      ? "novel"
      : worthiness === "apply-directly"
        ? "partial"
        : "conflict";

  const patternType = (
    ["technique", "mental-model", "anti-pattern", "architecture"].includes(
      idea.patternType,
    )
      ? idea.patternType
      : "technique"
  ) as DemoIdea["patternType"];

  return {
    id: idea.id || `api-${idea.sourceHash.slice(0, 8)}-${index}`,
    title: idea.title,
    description: idea.description,
    patternType,
    domains: idea.domain?.length
      ? idea.domain
      : (idea.applicability?.slice(0, 3) ?? ["general"]),
    worthiness,
    worthinessScore: score,
    matchType,
  };
}

export function toApiIdea(idea: DemoIdea, sourceUrl: string, sourceHash: string): IdeaFromAPI {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    domain: idea.domains,
    applicability: idea.domains,
    patternType: idea.patternType,
    sourceUrl,
    sourceHash,
    embedding: [],
  };
}

export interface IngestResult {
  source: DemoSource;
  ideas: DemoIdea[];
  fromApi: boolean;
}

export type SourceKind = "youtube" | "podcast" | "article" | "need";

export function detectSourceKind(
  value: string,
  mode: "content" | "need",
): SourceKind {
  if (mode === "need") return "need";
  if (/(?:youtube\.com|youtu\.be)/i.test(value)) return "youtube";
  if (
    /\.(mp3|m4a|wav)(\?|$)/i.test(value) ||
    /podcast/i.test(value) ||
    /\/(feed|rss)/i.test(value) ||
    /\.xml(\?|$)/i.test(value)
  ) {
    return "podcast";
  }
  return "article";
}

export type StreamHandlers = {
  onEvent?: (event: IngestStreamEvent) => void;
};

/**
 * Stream ingest with real progress events. Falls back to JSON /ingest,
 * then to seeded demo material so the floor never dies.
 */
export async function resolveIngestStream(
  value: string,
  mode: "content" | "need",
  handlers: StreamHandlers = {},
  signal?: AbortSignal,
): Promise<IngestResult> {
  const { onEvent } = handlers;

  if (mode === "need") {
    onEvent?.({
      type: "kind",
      contentType: "text",
      fondObject: "the need",
    });
    onEvent?.({
      type: "phase",
      phase: "extract",
      label: "Mapping your need…",
    });
    await sleep(420, signal);
    const ideas = seededNeedIdeas.map((idea, i) => ({
      ...idea,
      id: `${idea.id}-${Date.now()}-${i}`,
    }));
    onEvent?.({ type: "meta", title: value.slice(0, 64) || "Stated need" });
    for (const idea of ideas) {
      onEvent?.({
        type: "idea",
        idea: toApiIdea(idea, `need://${encodeURIComponent(value.slice(0, 48))}`, "need"),
      });
    }
    onEvent?.({
      type: "done",
      sourceHash: "need",
      contentType: "text",
      title: value.slice(0, 64) || "Stated need",
      textLength: value.length,
      ideaCount: ideas.length,
    });
    return {
      source: {
        type: "text",
        title: value.slice(0, 64) || "Stated need",
        author: "Need-first",
        url: `need://${encodeURIComponent(value.slice(0, 48))}`,
        ideasCount: ideas.length,
      },
      ideas,
      fromApi: false,
    };
  }

  const ideas: DemoIdea[] = [];
  let title = hostnameTitle(value);
  let contentType = detectSourceKind(value, "content");
  let sawDone = false;
  let streamError: string | null = null;

  try {
    await ingestURLStream(
      value,
      (event) => {
        onEvent?.(event);
        if (event.type === "meta") title = event.title;
        if (event.type === "kind") {
          contentType =
            event.contentType === "youtube"
              ? "youtube"
              : event.contentType === "podcast" || event.contentType === "audio"
                ? "podcast"
                : "article";
        }
        if (event.type === "idea") {
          ideas.push(mapApiIdea(event.idea, ideas.length));
        }
        if (event.type === "done") {
          sawDone = true;
          title = event.title || title;
          contentType =
            event.contentType === "youtube"
              ? "youtube"
              : event.contentType === "podcast" || event.contentType === "audio"
                ? "podcast"
                : "article";
        }
        if (event.type === "error") {
          streamError = event.error;
        }
      },
      signal,
    );

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (sawDone && ideas.length > 0) {
      return {
        source: {
          type: contentType === "podcast" ? "podcast" : contentType === "youtube" ? "blog" : "blog",
          title,
          url: value,
          ideasCount: ideas.length,
        },
        ideas,
        fromApi: true,
      };
    }

    if (streamError) {
      // fall through to JSON then demo
    }
  } catch (err) {
    if (isAbort(err)) throw err;
  }

  // JSON fallback
  try {
    const res = await Promise.race([
      ingestURL(value, signal),
      rejectAfter(45_000, signal),
    ]);

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (!res.error && res.ideas?.length) {
      const mapped = res.ideas.map(mapApiIdea);
      onEvent?.({
        type: "kind",
        contentType: res.contentType,
        fondObject:
          res.contentType === "youtube"
            ? "the talk"
            : res.contentType === "podcast" || res.contentType === "audio"
              ? "the pod"
              : "the piece",
      });
      onEvent?.({ type: "meta", title: res.title || hostnameTitle(value) });
      for (const idea of mapped) {
        onEvent?.({
          type: "idea",
          idea: toApiIdea(idea, value, res.sourceHash),
        });
      }
      onEvent?.({
        type: "done",
        sourceHash: res.sourceHash,
        contentType: res.contentType,
        title: res.title,
        textLength: res.textLength,
        ideaCount: mapped.length,
      });
      return {
        source: {
          type:
            detectSourceKind(value, "content") === "podcast" ? "podcast" : "blog",
          title: res.title || hostnameTitle(value),
          url: value,
          ideasCount: mapped.length,
        },
        ideas: mapped,
        fromApi: true,
      };
    }
  } catch (err) {
    if (isAbort(err)) throw err;
  }

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  // Seeded fallback
  const url = value.startsWith("http")
    ? value
    : `https://example.com/${encodeURIComponent(value)}`;
  const fallback = seededIngestIdeas.map((idea, i) => ({
    ...idea,
    id: `${idea.id}-${Date.now()}-${i}`,
  }));

  onEvent?.({
    type: "kind",
    contentType: guessType(value),
    fondObject: guessType(value) === "podcast" ? "the pod" : "the piece",
  });
  onEvent?.({
    type: "phase",
    phase: "extract",
    label: "Using local shards…",
  });
  onEvent?.({ type: "meta", title: hostnameTitle(url) });
  for (const idea of fallback) {
    onEvent?.({ type: "idea", idea: toApiIdea(idea, url, "demo") });
  }
  onEvent?.({
    type: "done",
    sourceHash: "demo",
    contentType: guessType(value),
    title: hostnameTitle(url),
    textLength: 0,
    ideaCount: fallback.length,
  });

  return {
    source: {
      type: guessType(value),
      title: hostnameTitle(url),
      author: "Ingested",
      url,
      ideasCount: fallback.length,
    },
    ideas: fallback,
    fromApi: false,
  };
}

/** @deprecated prefer resolveIngestStream */
export async function resolveIngest(
  value: string,
  mode: "content" | "need",
  signal?: AbortSignal,
): Promise<IngestResult> {
  return resolveIngestStream(value, mode, {}, signal);
}

function guessType(value: string): DemoSource["type"] {
  if (/\.(mp3|m4a|wav)(\?|$)/i.test(value) || /podcast/i.test(value)) {
    return "podcast";
  }
  return "blog";
}

function isAbort(err: unknown) {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function rejectAfter(ms: number, signal?: AbortSignal) {
  return new Promise<never>((_, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
