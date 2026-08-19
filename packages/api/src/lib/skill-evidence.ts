import type { Env } from "../index.js";

export type EvidenceLevel =
  | "none"
  | "claimed-use"
  | "outcome-attached"
  | "linked-pr"
  | "verified-pr";

export type EvidenceOutcome = {
  note: string;
  prUrl?: string;
  screenshotUrl?: string;
  attachedAt: string;
  /** A URL is evidence of a linked artifact, not independent verification. */
  prStatus?: "unverified" | "github-confirmed";
  githubState?: "open" | "closed";
  githubMerged?: boolean;
  githubTitle?: string;
};

export interface SkillEvidenceRecord {
  skillHash: string;
  /** Unique consented actors when actor identity was available. */
  claimedUseCount: number;
  /** All receipt attempts, including duplicates and untracked anonymous claims. */
  claimAttemptCount: number;
  lastClaimedAt?: string;
  outcome?: EvidenceOutcome;
  level: EvidenceLevel;
  updatedAt: string;
}

/**
 * A deliberately small, transparent summary for discovery surfaces.
 * It describes evidence attached to an artifact; it does not claim causality
 * or independently verified project impact.
 */
export interface EvidenceSummary {
  claimedUseCount: number;
  outcomeCount: number;
  linkedPrCount: number;
  githubConfirmedPrCount: number;
  mergedPrCount: number;
  evidenceScore: number;
}

export function summarizeEvidence(
  evidence: SkillEvidenceRecord | null | undefined,
): EvidenceSummary {
  const outcome = evidence?.outcome;
  const outcomeCount = outcome ? 1 : 0;
  const linkedPrCount = outcome?.prUrl ? 1 : 0;
  const githubConfirmedPrCount =
    outcome?.prStatus === "github-confirmed" ? 1 : 0;
  const mergedPrCount = outcome?.githubMerged ? 1 : 0;
  const claimedUseCount = evidence?.claimedUseCount ?? 0;

  // Ranking aid only: explicit evidence gets more weight than a bare claim.
  // Keep the formula in code so the UI can explain what it means.
  const evidenceScore =
    claimedUseCount +
    outcomeCount * 3 +
    githubConfirmedPrCount * 5 +
    mergedPrCount * 2;

  return {
    claimedUseCount,
    outcomeCount,
    linkedPrCount,
    githubConfirmedPrCount,
    mergedPrCount,
    evidenceScore,
  };
}

export interface ClaimedUseResult {
  evidence: SkillEvidenceRecord;
  deduplicated: boolean;
  tracking: "account" | "browser-consent" | "untracked";
}

export type VerifyPrResult =
  | { ok: true; evidence: SkillEvidenceRecord }
  | { ok: false; reason: string; evidence?: SkillEvidenceRecord };

const PREFIX = "skill-evidence:";
const CLAIM_PREFIX = "skill-evidence-claim:";
const NOTE_CAP = 280;
const URL_CAP = 500;

function normalizeHash(hash: string): string {
  return hash.toLowerCase().replace(/^0x/, "");
}

function keyFor(hash: string): string {
  return PREFIX + normalizeHash(hash);
}

function claimKeyFor(hash: string, actorDigest: string): string {
  return `${CLAIM_PREFIX}${normalizeHash(hash)}:${actorDigest}`;
}

function sanitizeHttpUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString().slice(0, URL_CAP);
  } catch {
    return undefined;
  }
}

function levelFor(
  claimedUseCount: number,
  outcome: EvidenceOutcome | undefined,
): EvidenceLevel {
  if (outcome?.prStatus === "github-confirmed") return "verified-pr";
  if (outcome?.prUrl) return "linked-pr";
  if (outcome) return "outcome-attached";
  if (claimedUseCount > 0) return "claimed-use";
  return "none";
}

async function digestActor(actorKey: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(actorKey),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function readEvidence(
  env: Env,
  hash: string,
): Promise<SkillEvidenceRecord | null> {
  return (await env.SESSIONS.get(keyFor(hash), "json")) as
    | SkillEvidenceRecord
    | null;
}

async function writeEvidence(
  env: Env,
  hash: string,
  current: Omit<SkillEvidenceRecord, "skillHash">,
): Promise<SkillEvidenceRecord> {
  const record: SkillEvidenceRecord = {
    skillHash: normalizeHash(hash),
    ...current,
  };
  // Evidence is part of a public artifact's durable history, not analytics
  // cache. It contains no repository contents or private project details.
  await env.SESSIONS.put(keyFor(hash), JSON.stringify(record));
  return record;
}

export async function getSkillEvidence(
  env: Env,
  hash: string,
): Promise<SkillEvidenceRecord | null> {
  return readEvidence(env, hash);
}

/**
 * Record a claimed use. actorKey should be either a server-derived account
 * identity or a random browser receipt key explicitly consented to by the user.
 * Only the SHA-256 digest is stored as the per-actor marker.
 */
export async function recordClaimedUse(
  env: Env,
  hash: string,
  actorKey?: string,
): Promise<ClaimedUseResult> {
  const existing = await readEvidence(env, hash);
  const claimAttemptCount = (existing?.claimAttemptCount ?? existing?.claimedUseCount ?? 0) + 1;
  const now = new Date().toISOString();
  const tracking: ClaimedUseResult["tracking"] = actorKey
    ? actorKey.startsWith("user:")
      ? "account"
      : "browser-consent"
    : "untracked";

  let deduplicated = false;
  let claimedUseCount = existing?.claimedUseCount ?? 0;
  if (actorKey) {
    const actorDigest = await digestActor(actorKey);
    const markerKey = claimKeyFor(hash, actorDigest);
    const marker = await env.SESSIONS.get(markerKey);
    if (marker) {
      deduplicated = true;
    } else {
      await env.SESSIONS.put(markerKey, "1");
      claimedUseCount += 1;
    }
  } else {
    // Preserve the old endpoint behavior for direct/API callers that did not
    // provide a consented identity, but make its lack of dedup explicit.
    claimedUseCount += 1;
  }

  const evidence = await writeEvidence(env, hash, {
    claimedUseCount,
    claimAttemptCount,
    lastClaimedAt: now,
    outcome: existing?.outcome,
    level: levelFor(claimedUseCount, existing?.outcome),
    updatedAt: now,
  });
  return { evidence, deduplicated, tracking };
}

/** Persist an outcome receipt with honest linked-PR semantics. */
export async function recordOutcome(
  env: Env,
  hash: string,
  input:
    | {
        note: string;
        prUrl?: string;
        screenshotUrl?: string;
      }
    | null,
): Promise<SkillEvidenceRecord> {
  const existing = await readEvidence(env, hash);
  const now = new Date().toISOString();
  const prUrl = sanitizeHttpUrl(input?.prUrl);
  const outcome = input
    ? {
        note: input.note.trim().slice(0, NOTE_CAP),
        prUrl,
        screenshotUrl: sanitizeHttpUrl(input.screenshotUrl),
        attachedAt: now,
        ...(prUrl ? { prStatus: "unverified" as const } : {}),
      }
    : undefined;

  return writeEvidence(env, hash, {
    claimedUseCount: existing?.claimedUseCount ?? 0,
    claimAttemptCount: existing?.claimAttemptCount ?? existing?.claimedUseCount ?? 0,
    lastClaimedAt: existing?.lastClaimedAt,
    outcome,
    level: levelFor(existing?.claimedUseCount ?? 0, outcome),
    updatedAt: now,
  });
}

function parseGitHubPullRequestUrl(raw: string): {
  owner: string;
  repo: string;
  number: number;
} | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") {
      return null;
    }
    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/i);
    if (!match) return null;
    const number = Number(match[3]);
    if (!Number.isSafeInteger(number) || number < 1) return null;
    return { owner: match[1]!, repo: match[2]!, number };
  } catch {
    return null;
  }
}

/** Confirm that GitHub knows the linked public PR; do not infer causality. */
export async function verifyLinkedPr(
  env: Env,
  hash: string,
  accessToken?: string,
): Promise<VerifyPrResult> {
  const existing = await readEvidence(env, hash);
  const prUrl = existing?.outcome?.prUrl;
  if (!prUrl) return { ok: false, reason: "No linked PR to verify", evidence: existing ?? undefined };

  const parsed = parseGitHubPullRequestUrl(prUrl);
  if (!parsed) return { ok: false, reason: "Only public github.com pull URLs can be checked", evidence: existing ?? undefined };

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "fondof-api",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/pulls/${parsed.number}`,
      { headers },
    );
  } catch {
    return { ok: false, reason: "GitHub could not be reached", evidence: existing ?? undefined };
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: response.status === 404 ? "GitHub PR was not found" : `GitHub returned ${response.status}`,
      evidence: existing ?? undefined,
    };
  }

  const pr = (await response.json()) as {
    html_url?: string;
    title?: string;
    state?: string;
    merged_at?: string | null;
  };
  const canonicalUrl = sanitizeHttpUrl(pr.html_url) ?? prUrl;
  const outcome: EvidenceOutcome = {
    ...existing!.outcome!,
    prUrl: canonicalUrl,
    prStatus: "github-confirmed",
    githubState: pr.state === "closed" ? "closed" : "open",
    githubMerged: Boolean(pr.merged_at),
    githubTitle: pr.title?.slice(0, 200),
  };
  const evidence = await writeEvidence(env, hash, {
    claimedUseCount: existing?.claimedUseCount ?? 0,
    claimAttemptCount: existing?.claimAttemptCount ?? existing?.claimedUseCount ?? 0,
    lastClaimedAt: existing?.lastClaimedAt,
    outcome,
    level: levelFor(existing?.claimedUseCount ?? 0, outcome),
    updatedAt: new Date().toISOString(),
  });
  return { ok: true, evidence };
}
