/**
 * Durable public skill registry (KV).
 *
 * The on-chain SkillPool stores hashes only, and Cache API meta is evictable.
 * The thing people actually share is the markdown + source + fitted-to — so a
 * public forge writes a durable record here and /s/[hash] resolves WITHOUT an
 * on-chain attestation. Publishing to SkillPool is a second, optional click.
 */

import type { Env } from "../index.js";

export interface PublicSkillRecord {
  hash: string;
  title: string;
  blurb?: string;
  markdown: string;
  repo?: string;
  frameworks?: string[];
  languages?: string[];
  sourceUrls: string[];
  sourceHashes: string[];
  composedAt: string;
  /** True once stamped on-chain (SkillPool attestation). */
  onChain: boolean;
  attestedTxHash?: string;
  attestedAt?: string;
}

export type PublicSkillInput = Omit<
  PublicSkillRecord,
  "onChain" | "attestedTxHash" | "attestedAt"
>;

const YEAR = 60 * 60 * 24 * 365;
const PREFIX = "pub-skill:";
const MARKDOWN_CAP = 20_000;

function keyFor(hash: string): string {
  return PREFIX + hash.toLowerCase().replace(/^0x/, "");
}

function normalizeHash(hash: string): string {
  return hash.toLowerCase().replace(/^0x/, "");
}

export async function getPublicSkill(
  env: Env,
  hash: string,
): Promise<PublicSkillRecord | null> {
  try {
    const rec = (await env.SESSIONS.get(
      keyFor(hash),
      "json",
    )) as PublicSkillRecord | null;
    return rec && typeof rec.hash === "string" && typeof rec.markdown === "string"
      ? rec
      : null;
  } catch {
    return null;
  }
}

/**
 * Upsert a public skill. Prior on-chain attestation (if any) is preserved.
 */
export async function recordPublicSkill(
  env: Env,
  input: PublicSkillInput,
): Promise<void> {
  const key = keyFor(input.hash);
  const existing = (await env.SESSIONS
    .get(key, "json")
    .catch(() => null)) as PublicSkillRecord | null;

  const record: PublicSkillRecord = {
    hash: normalizeHash(input.hash),
    title: (input.title || "Untitled skill").slice(0, 160),
    blurb: input.blurb?.slice(0, 280),
    markdown: (input.markdown || "").slice(0, MARKDOWN_CAP),
    repo: input.repo?.slice(0, 120),
    frameworks: input.frameworks?.slice(0, 8).map((f) => f.slice(0, 40)),
    languages: input.languages?.slice(0, 8).map((l) => l.slice(0, 40)),
    sourceUrls: input.sourceUrls.slice(0, 12),
    sourceHashes: input.sourceHashes.slice(0, 24),
    composedAt: input.composedAt,
    onChain: existing?.onChain ?? false,
    attestedTxHash: existing?.attestedTxHash,
    attestedAt: existing?.attestedAt,
  };

  await env.SESSIONS.put(key, JSON.stringify(record), { expirationTtl: YEAR });
}

/**
 * Mark a public skill as stamped on-chain (publish second click).
 * Returns false when no registry record exists yet.
 */
export async function markSkillAttested(
  env: Env,
  hash: string,
  txHash: string,
): Promise<boolean> {
  const key = keyFor(hash);
  const existing = (await env.SESSIONS
    .get(key, "json")
    .catch(() => null)) as PublicSkillRecord | null;
  if (!existing) return false;

  existing.onChain = true;
  existing.attestedTxHash = txHash;
  existing.attestedAt = new Date().toISOString();
  await env.SESSIONS.put(key, JSON.stringify(existing), {
    expirationTtl: YEAR,
  });
  return true;
}

/**
 * Recent public skills, newest first (the "pool of skills, not txs").
 */
export async function listPublicSkills(
  env: Env,
  limit = 20,
): Promise<PublicSkillRecord[]> {
  const listed = await env.SESSIONS.list({
    prefix: PREFIX,
    limit: Math.min(limit * 2, 100),
  });
  if (!listed?.keys?.length) return [];

  const records = await Promise.all(
    listed.keys.map((k) => getPublicSkill(env, k.name.slice(PREFIX.length))),
  );
  return records
    .filter((r): r is PublicSkillRecord => r !== null)
    .sort((a, b) => (b.composedAt || "").localeCompare(a.composedAt || ""))
    .slice(0, limit);
}
