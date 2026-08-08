const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://fondof-api.trustfall.workers.dev";

export interface IdeaFromAPI {
  id: string;
  title: string;
  description: string;
  domain: string[];
  applicability: string[];
  patternType: "technique" | "mental-model" | "anti-pattern" | "architecture";
  sourceUrl: string;
  sourceHash: string;
  embedding: number[];
}

export interface ExistingSkillHit {
  title: string;
  url: string;
  snippet: string;
  /** Best embedding cosine vs compared ideas (Compare stage) */
  score?: number;
  /** Per-idea embedding scores when Compare ranked with embeddings */
  ideaScores?: Array<{ ideaIndex: number; score: number }>;
}

export type IngestProvider =
  | "firecrawl"
  | "html"
  | "timedtext"
  | "page"
  | "elevenlabs"
  | "rss"
  | "workers-ai"
  | "cache";

export interface IngestValue {
  providers: IngestProvider[];
  extractProvider?: IngestProvider;
  cacheHit: boolean;
  sourceHash: string;
  textLength: number;
  ideaCount: number;
  deferred: Array<"exa" | "forge" | "publish">;
}

export interface IngestResponse {
  contentType: string;
  sourceHash: string;
  title: string;
  ideas: IdeaFromAPI[];
  textLength: number;
  existingSkills?: ExistingSkillHit[];
  providers?: IngestProvider[];
  extractProvider?: IngestProvider;
  cached?: boolean;
  deferred?: Array<"exa" | "forge" | "publish">;
  error?: string;
}

export interface ForgeResponse {
  title: string;
  skillHash: string;
  sourceHashes: string[];
  markdown: string;
  fittedTo: string;
  composedAt: string;
  error?: string;
}

export interface PublishResponse {
  success: boolean;
  txHash: string;
  blockNumber: number;
  skillHash: string;
  explorer: string;
  error?: string;
}

export interface SkillOnChainResponse {
  skillHash: string;
  forger: string;
  backing: string;
  usageCount: number;
  challengeLosses: number;
  createdAt: number;
  signal: string;
  error?: string;
}

export async function ingestURL(
  url: string,
  signal?: AbortSignal,
): Promise<IngestResponse> {
  const res = await fetch(`${API_URL}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal,
  });
  return res.json();
}

export type IngestStreamEvent =
  | {
      type: "kind";
      contentType: string;
      fondObject: string;
    }
  | { type: "phase"; phase: string; label: string }
  | { type: "meta"; title: string }
  | { type: "idea"; idea: IdeaFromAPI }
  | { type: "value"; value: IngestValue }
  | {
      type: "discovery";
      existingSkills: ExistingSkillHit[];
    }
  | {
      type: "done";
      sourceHash: string;
      contentType: string;
      title: string;
      textLength: number;
      ideaCount: number;
      cacheHit?: boolean;
      providers?: IngestProvider[];
    }
  | { type: "error"; error: string };

/** NDJSON ingest progress stream. */
export async function ingestURLStream(
  url: string,
  onEvent: (event: IngestStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/ingest/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal,
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: "Stream failed" }));
    onEvent({
      type: "error",
      error: (err as { error?: string }).error || `HTTP ${res.status}`,
    });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        onEvent(JSON.parse(trimmed) as IngestStreamEvent);
      } catch {
        // skip malformed line
      }
    }
  }

  if (buffer.trim()) {
    try {
      onEvent(JSON.parse(buffer.trim()) as IngestStreamEvent);
    } catch {
      // ignore
    }
  }
}

export async function forgeSkill(
  ideas: Array<{ title: string; description: string; sourceUrl: string }>,
  repo?: { name: string; frameworks: string[]; languages: string[] },
  gapAgainst?: { title: string; url: string; snippet?: string },
): Promise<ForgeResponse> {
  const res = await fetch(`${API_URL}/api/forge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ideas, repo, gapAgainst }),
  });
  return res.json();
}

export async function publishSkill(
  skillHash: string,
  sourceHashes: string[]
): Promise<PublishResponse> {
  const res = await fetch(`${API_URL}/api/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skillHash, sourceHashes }),
  });
  return res.json();
}

export async function getSkillSignal(hash: string): Promise<SkillOnChainResponse> {
  const res = await fetch(`${API_URL}/api/skills/${hash}`);
  return res.json();
}

export async function getTopSkills(
  limit = 5,
): Promise<{ skills: SkillOnChainResponse[]; error?: string }> {
  const res = await fetch(`${API_URL}/api/skills?limit=${limit}`);
  return res.json();
}

export async function recordUsage(
  hash: string,
): Promise<{ success?: boolean; txHash?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/skills/${hash}/use`, {
    method: "POST",
  });
  return res.json();
}

export async function challengeSkill(
  skillHash: string
): Promise<{
  success?: boolean;
  txHash?: string;
  explorer?: string;
  error?: string;
}> {
  const res = await fetch(`${API_URL}/api/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skillHash }),
  });
  return res.json();
}

/** Compare stage — Exa catalogs (not run during extract). */
export async function searchExistingSkills(
  query: string,
  ideas?: Array<{
    title: string;
    description?: string;
    embedding?: number[];
  }>,
): Promise<{
  results: ExistingSkillHit[];
  provider?: string | null;
  embedScored?: boolean;
  error?: string;
}> {
  const res = await fetch(`${API_URL}/api/search/skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, ideas }),
  });
  return res.json();
}
