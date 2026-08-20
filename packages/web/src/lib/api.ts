import { API_BASE } from "@/lib/api-base";
import { getToken } from "@/lib/auth";

const API_URL = API_BASE;

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

export interface CanonicalSource {
  id: string;
  url: string;
  domain: string;
}

export interface SkillGenre {
  slug: string;
  label: string;
  description: string;
}

export interface GenreFacet extends SkillGenre {
  count: number;
}

export interface ForgeResponse {
  title: string;
  skillHash: string;
  sourceHashes: string[];
  sourceUrls?: string[];
  canonicalSources?: CanonicalSource[];
  domains?: string[];
  patternTypes?: string[];
  derivedFromSkillHash?: string;
  markdown: string;
  fittedTo: string;
  composedAt: string;
  private?: boolean;
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

export type EvidenceLevel =
  | "none"
  | "claimed-use"
  | "outcome-attached"
  | "linked-pr"
  | "verified-pr";

export interface EvidenceSummary {
  claimedUseCount: number;
  outcomeCount: number;
  linkedPrCount: number;
  githubConfirmedPrCount: number;
  mergedPrCount: number;
  evidenceScore: number;
}

export interface ImpactSummary extends EvidenceSummary {
  skillCount: number;
  skillsWithEvidence: number;
  remixCount: number;
  fittedRepoCount: number;
}

export interface SkillEvidence {
  skillHash: string;
  claimedUseCount: number;
  claimAttemptCount?: number;
  lastClaimedAt?: string;
  outcome?: SkillOutcome;
  level: EvidenceLevel;
  updatedAt: string;
}

export interface SkillOutcome {
  note: string;
  prUrl?: string;
  screenshotUrl?: string;
  attachedAt?: string;
  prStatus?: "unverified" | "github-confirmed";
  githubState?: "open" | "closed";
  githubMerged?: boolean;
  githubTitle?: string;
}

export interface SkillOnChainResponse {
  skillHash: string;
  forger: string;
  backing: string;
  usageCount: number;
  challengeLosses: number;
  createdAt: number;
  signal: string;
  sourceHashes?: string[];
  /** Human artifact from edge meta (not on-chain) */
  title?: string;
  blurb?: string;
  repo?: string;
  markdown?: string;
  landings?: Array<{ path: string; why: string }>;
  frameworks?: string[];
  languages?: string[];
  domains?: string[];
  patternTypes?: string[];
  derivedFromSkillHash?: string;
  lineageChildrenCount?: number;
  genres?: SkillGenre[];
  outcome?: SkillOutcome;
  evidence?: SkillEvidence;
  /** Transparent discovery summary; not a causal impact claim. */
  evidenceSummary?: EvidenceSummary;
  /** Real source URLs (not just hashes) for provenance links */
  sourceUrls?: string[];
  canonicalSources?: CanonicalSource[];
  /** False = public off-chain skill, not yet stamped on-chain */
  onChain?: boolean;
  visibility?: "public" | "unlisted";
  ownerLogin?: string;
  attestedTxHash?: string;
  attestedAt?: string;
  /** ElevenAgent share URL — set after agent creation via Hosted MCP */
  agentUrl?: string;
  error?: string;
}

export async function ingestURL(
  input: { url: string } | { need: string },
  signal?: AbortSignal,
): Promise<IngestResponse> {
  const res = await fetch(`${API_URL}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
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
  | {
      type: "sourceText";
      text: string;
      contentType: string;
    }
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

/** NDJSON ingest progress stream. Accepts a URL or a stated need. */
export async function ingestURLStream(
  input: { url: string } | { need: string },
  onEvent: (event: IngestStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/ingest/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
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
  ideas: Array<{
    title: string;
    description: string;
    sourceUrl: string;
    domains?: string[];
    applicability?: string[];
    patternType?: string;
  }>,
  repo?: { name: string; frameworks: string[]; languages: string[] },
  gapAgainst?: { title: string; url: string; snippet?: string },
  options?: { private?: boolean; derivedFromSkillHash?: string },
): Promise<ForgeResponse> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/forge`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ideas,
      repo,
      gapAgainst,
      private: options?.private,
      derivedFromSkillHash: options?.derivedFromSkillHash,
    }),
  });
  return res.json();
}

export async function publishSkill(
  skillHash: string,
  sourceHashes: string[],
  meta?: {
    title?: string;
    blurb?: string;
    repo?: string;
    markdown?: string;
    landings?: Array<{ path: string; why: string }>;
    frameworks?: string[];
  },
): Promise<PublishResponse> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/publish`, {
    method: "POST",
    headers,
    body: JSON.stringify({ skillHash, sourceHashes, ...meta }),
  });
  return res.json();
}

/** After wallet forge — persist artifact for /pool and skill pages. */
export async function publishSkillMeta(
  skillHash: string,
  meta: {
    title?: string;
    blurb?: string;
    repo?: string;
    markdown?: string;
    landings?: Array<{ path: string; why: string }>;
    frameworks?: string[];
    outcome?: SkillOutcome | null;
    agentUrl?: string | null;
  },
): Promise<{
  success?: boolean;
  error?: string;
  meta?: unknown;
  evidence?: SkillEvidence;
}> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    `${API_URL}/api/skills/${encodeURIComponent(skillHash)}/meta`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(meta),
    },
  );
  return res.json();
}

export async function shareSkill(
  skillHash: string,
  meta: {
    title: string;
    markdown: string;
    repo?: string;
    frameworks?: string[];
    languages?: string[];
    domains?: string[];
    patternTypes?: string[];
    derivedFromSkillHash?: string;
    canonicalSources?: CanonicalSource[];
    sourceUrls?: string[];
    sourceHashes?: string[];
    composedAt?: string;
  },
): Promise<{ success?: boolean; skillHash?: string; visibility?: string; error?: string }> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/skills/${encodeURIComponent(skillHash)}/share`, {
    method: "POST",
    headers,
    body: JSON.stringify(meta),
  });
  return res.json();
}

export async function unlistSkill(
  skillHash: string,
): Promise<{ success?: boolean; visibility?: string; error?: string }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    `${API_URL}/api/skills/${encodeURIComponent(skillHash)}/visibility`,
    { method: "DELETE", headers },
  );
  return res.json();
}

export async function getCreatorImpact(login: string): Promise<{
  login: string;
  impact: ImpactSummary;
  error?: string;
}> {
  const res = await fetch(
    `${API_URL}/api/skills/creator/${encodeURIComponent(login)}`,
  );
  return res.json();
}

export interface SkillLineageNode {
  hash: string;
  title: string;
  repo?: string;
  composedAt: string;
  derivedFromSkillHash?: string;
  sourceUrls?: string[];
  canonicalSources?: CanonicalSource[];
  genres?: SkillGenre[];
}

export async function getSkillLineage(hash: string): Promise<{
  skillHash?: string;
  parent?: SkillLineageNode | null;
  ancestors?: SkillLineageNode[];
  skill?: SkillLineageNode;
  children?: SkillLineageNode[];
  note?: string;
  error?: string;
}> {
  const res = await fetch(
    `${API_URL}/api/skills/${encodeURIComponent(hash)}/lineage`,
  );
  return res.json();
}

export async function getSkillSignal(hash: string): Promise<SkillOnChainResponse> {
  const res = await fetch(`${API_URL}/api/skills/${hash}`);
  return res.json();
}

export async function getTopSkills(
  limit = 5,
  sort: "recent" | "impact" | "outcomes" | "adapted" = "recent",
): Promise<{
  skills: SkillOnChainResponse[];
  sort?: string;
  facets?: { genres?: GenreFacet[] };
  error?: string;
}> {
  const res = await fetch(`${API_URL}/api/skills?limit=${limit}&sort=${sort}`);
  return res.json();
}

export async function recordUsage(
  hash: string,
  options?: { receiptKey?: string; consented?: boolean },
): Promise<{
  success?: boolean;
  claimed?: boolean;
  deduplicated?: boolean;
  tracking?: "account" | "browser-consent" | "untracked";
  txHash?: string;
  evidence?: SkillEvidence;
  note?: string;
  error?: string;
}> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/skills/${encodeURIComponent(hash)}/use`, {
    method: "POST",
    headers,
    body: JSON.stringify(options ?? {}),
  });
  return res.json();
}

export async function verifySkillPr(
  hash: string,
): Promise<{
  success?: boolean;
  evidence?: SkillEvidence;
  note?: string;
  error?: string;
}> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    `${API_URL}/api/skills/${encodeURIComponent(hash)}/verify-pr`,
    { method: "POST", headers },
  );
  return res.json();
}

/** Burst of on-chain use() receipts — Monad per-agent quality demo. */
export async function stormUsage(
  hash: string,
  count = 12,
): Promise<{
  success?: boolean;
  count?: number;
  submittedMs?: number;
  confirmedMs?: number;
  signal?: string;
  usageCount?: number;
  explorer?: string;
  note?: string;
  error?: string;
}> {
  const res = await fetch(`${API_URL}/api/skills/${encodeURIComponent(hash)}/storm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  return res.json();
}

export async function challengeSkill(
  skillHash: string
): Promise<{
  success?: boolean;
  txHash?: string;
  explorer?: string;
  challengeId?: number;
  error?: string;
}> {
  const res = await fetch(`${API_URL}/api/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skillHash }),
  });
  return res.json();
}

export type OnChainChallenge = {
  challengeId: number;
  skillHash: string;
  challenger: string;
  stake: string;
  resolved: boolean;
  challengerWon: boolean;
  createdAt: number;
};

/** Weighted random skill by on-chain signal. */
export async function acquireSkill(seed?: string): Promise<{
  skillHash?: string;
  skill?: SkillOnChainResponse;
  error?: string;
}> {
  const res = await fetch(`${API_URL}/api/skills/acquire`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed }),
  });
  return res.json();
}

export async function listOpenChallenges(
  skillHash?: string,
): Promise<{ challenges: OnChainChallenge[]; error?: string }> {
  const q = skillHash
    ? `?skillHash=${encodeURIComponent(skillHash)}`
    : "";
  const res = await fetch(`${API_URL}/api/challenges${q}`);
  return res.json();
}

/** Resolver settles challenge — challengerWon true cuts skill signal. */
export async function resolveChallenge(
  challengeId: number,
  challengerWon: boolean,
): Promise<{
  success?: boolean;
  txHash?: string;
  explorer?: string;
  challengerWon?: boolean;
  error?: string;
}> {
  const res = await fetch(`${API_URL}/api/challenge/${challengeId}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengerWon }),
  });
  return res.json();
}

/** One-shot compose: ingest → top shards → forge → skill markdown. */
export interface ComposeResponse {
  markdown?: string;
  ideas?: IdeaFromAPI[];
  allIdeas?: IdeaFromAPI[];
  totalIdeasCount?: number;
  sourceTitle?: string;
  textLength?: number;
  skillHash?: string;
  skillUrl?: string | null;
  canonicalSources?: CanonicalSource[];
  derivedFromSkillHash?: string;
  title?: string;
  sourceUrl?: string;
  sourceHash?: string;
  contentType?: string;
  fittedTo?: string;
  onChain?: boolean;
  private?: boolean;
  ingestCacheHit?: boolean;
  providers?: string[];
  error?: string;
}

export async function composeSkill(body: {
  url?: string;
  need?: string;
  repo?: string | { name: string; frameworks?: string[]; languages?: string[] };
  topShards?: number;
  private?: boolean;
}): Promise<ComposeResponse> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/compose`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
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
