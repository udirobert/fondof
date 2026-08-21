/**
 * Durable public skill registry (KV).
 *
 * The on-chain SkillPool stores hashes only, and Cache API meta is evictable.
 * The thing people actually share is the markdown + source + fitted-to — so a
 * public forge writes a durable record here and /s/[hash] resolves WITHOUT an
 * on-chain attestation. SkillPool attestation is a second, optional click.
 */

import type { Env } from "../index.js";
import {
  canonicalSources,
  type CanonicalSource,
} from "./source-url.js";

export type SkillVisibility = "public" | "unlisted";

export interface PublicSkillRecord {
  hash: string;
  /** Versioned non-expiring KV artifact record. */
  storageVersion?: 2;
  title: string;
  blurb?: string;
  markdown: string;
  repo?: string;
  frameworks?: string[];
  languages?: string[];
  domains?: string[];
  patternTypes?: string[];
  derivedFromSkillHash?: string;
  canonicalSources?: CanonicalSource[];
  sourceUrls: string[];
  sourceHashes: string[];
  composedAt: string;
  visibility: SkillVisibility;
  ownerId?: number;
  ownerLogin?: string;
  /** True once stamped on-chain (SkillPool attestation). */
  onChain: boolean;
  attestedTxHash?: string;
  attestedAt?: string;
}

export interface PublicSkillInput {
  hash: string;
  title: string;
  blurb?: string;
  markdown: string;
  repo?: string;
  frameworks?: string[];
  languages?: string[];
  domains?: string[];
  patternTypes?: string[];
  derivedFromSkillHash?: string;
  canonicalSources?: CanonicalSource[];
  sourceUrls: string[];
  sourceHashes: string[];
  composedAt: string;
  visibility?: SkillVisibility;
  ownerId?: number;
  ownerLogin?: string;
}

const YEAR = 60 * 60 * 24 * 365;
const PREFIX = "pub-skill:";
const MARKDOWN_CAP = 20_000;

function keyFor(hash: string): string {
  return PREFIX + hash.toLowerCase().replace(/^0x/, "");
}

function normalizeHash(hash: string): string {
  return hash.toLowerCase().replace(/^0x/, "");
}

async function getStoredSkill(
  env: Env,
  hash: string,
): Promise<PublicSkillRecord | null> {
  try {
    const rec = (await env.SESSIONS.get(
      keyFor(hash),
      "json",
    )) as PublicSkillRecord | null;
    if (!rec || typeof rec.hash !== "string" || typeof rec.markdown !== "string") {
      return null;
    }
    // Backward compatibility plus best-effort migration away from the old
    // one-year TTL. Future public artifact records are non-expiring KV data.
    const migrated: PublicSkillRecord = {
      ...rec,
      storageVersion: 2,
      visibility: rec.visibility === "unlisted" ? "unlisted" : "public",
    };
    if (rec.storageVersion !== 2) {
      await env.SESSIONS.put(keyFor(hash), JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return null;
  }
}

/** Read a record including an unlisted tombstone. */
export async function getSkillRecord(
  env: Env,
  hash: string,
): Promise<PublicSkillRecord | null> {
  return getStoredSkill(env, hash);
}

/** Read only a discoverable public record. */
export async function getPublicSkill(
  env: Env,
  hash: string,
): Promise<PublicSkillRecord | null> {
  const rec = await getStoredSkill(env, hash);
  return rec?.visibility === "public" ? rec : null;
}

export type PublicSkillMutationAccess =
  | "create"
  | "update"
  | "forbidden"
  | "immutable";

/**
 * Who may mutate an existing public record. A missing record is a create.
 * Legacy ownerless records are immutable — claiming ownership is not an upsert.
 */
export function publicSkillMutationAccess(
  existing: PublicSkillRecord | null,
  actorUserId: number | undefined,
): PublicSkillMutationAccess {
  if (!existing) return "create";
  if (existing.ownerId == null) return "immutable";
  if (actorUserId != null && existing.ownerId === actorUserId) return "update";
  return "forbidden";
}

/**
 * Upsert a public skill. Prior on-chain attestation is preserved. Stored
 * ownership is never replaced here — transfer is not part of a general upsert.
 */
export async function recordPublicSkill(
  env: Env,
  input: PublicSkillInput,
): Promise<void> {
  const key = keyFor(input.hash);
  const existing = await getStoredSkill(env, input.hash);

  const record: PublicSkillRecord = {
    hash: normalizeHash(input.hash),
    storageVersion: 2,
    title: (input.title || "Untitled skill").slice(0, 160),
    blurb: input.blurb?.slice(0, 280),
    markdown: (input.markdown || "").slice(0, MARKDOWN_CAP),
    repo: input.repo?.slice(0, 120),
    frameworks: input.frameworks?.slice(0, 8).map((f) => f.slice(0, 40)),
    languages: input.languages?.slice(0, 8).map((l) => l.slice(0, 40)),
    domains: input.domains?.slice(0, 12).map((domain) => domain.slice(0, 40)),
    patternTypes: input.patternTypes?.slice(0, 8).map((type) => type.slice(0, 40)),
    derivedFromSkillHash: input.derivedFromSkillHash
      ?.toLowerCase()
      .replace(/^0x/, "")
      .slice(0, 128),
    canonicalSources: (
      input.canonicalSources ?? (await canonicalSources(input.sourceUrls))
    ).slice(0, 12),
    sourceUrls: input.sourceUrls.slice(0, 12),
    sourceHashes: input.sourceHashes.slice(0, 24),
    composedAt: input.composedAt,
    visibility: input.visibility ?? "public",
    ownerId: existing ? existing.ownerId : input.ownerId,
    ownerLogin: existing ? existing.ownerLogin : input.ownerLogin,
    onChain: existing?.onChain ?? false,
    attestedTxHash: existing?.attestedTxHash,
    attestedAt: existing?.attestedAt,
  };

  // Public artifacts are durable records, not expiring cache entries.
  await env.SESSIONS.put(key, JSON.stringify(record));
}

/**
 * Create or owner-update a public record. Skips when the hash already belongs
 * to someone else or to an ownerless legacy artifact.
 */
export async function recordPublicSkillIfActorAllowed(
  env: Env,
  input: PublicSkillInput,
): Promise<"created" | "updated" | "skipped"> {
  const existing = await getStoredSkill(env, input.hash);
  const access = publicSkillMutationAccess(existing, input.ownerId);
  if (access !== "create" && access !== "update") return "skipped";
  await recordPublicSkill(env, input);
  return access === "create" ? "created" : "updated";
}

export type PublicSkillPatch = {
  title?: string;
  blurb?: string;
  repo?: string;
  markdown?: string;
  frameworks?: string[];
};

/** Keep public artifact metadata durable when the legacy meta endpoint is used. */
export async function patchPublicSkill(
  env: Env,
  hash: string,
  patch: PublicSkillPatch,
): Promise<PublicSkillRecord | null> {
  const existing = await getStoredSkill(env, hash);
  if (!existing) return null;

  if (patch.title !== undefined) existing.title = patch.title.trim().slice(0, 160);
  if (patch.blurb !== undefined) existing.blurb = patch.blurb.trim().slice(0, 280) || undefined;
  if (patch.repo !== undefined) existing.repo = patch.repo.trim().slice(0, 120) || undefined;
  if (patch.markdown !== undefined && patch.markdown.trim()) {
    existing.markdown = patch.markdown.trim().slice(0, MARKDOWN_CAP);
  }
  if (patch.frameworks !== undefined) {
    existing.frameworks = patch.frameworks.slice(0, 8).map((f) => f.slice(0, 40));
  }
  existing.storageVersion = 2;
  await env.SESSIONS.put(keyFor(hash), JSON.stringify(existing));
  return existing;
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
  const existing = await getStoredSkill(env, hash);
  if (!existing) return false;

  existing.onChain = true;
  existing.attestedTxHash = txHash;
  existing.attestedAt = new Date().toISOString();
  await env.SESSIONS.put(key, JSON.stringify(existing));
  return true;
}

/** Remove a skill from source-domain discovery indexes without deleting provenance. */
export async function removeSkillFromSourceIndexes(
  env: Env,
  sourceUrls: readonly string[],
  skillHash: string,
): Promise<void> {
  const normalizedHash = normalizeHash(skillHash);
  const domains = new Set<string>();
  for (const sourceUrl of sourceUrls) {
    try {
      domains.add(new URL(sourceUrl).hostname.replace(/^www\./, ""));
    } catch {
      // Direct needs and malformed provenance have no source-domain index.
    }
  }
  for (const source of await canonicalSources(sourceUrls)) {
    domains.add(source.domain);
  }

  await Promise.all(
    [...domains].map(async (domain) => {
      const key = `source:${domain}`;
      const entries = (await env.SESSIONS.get(key, "json")) as Array<{
        skillHash?: string;
      }> | null;
      if (!entries) return;
      const remaining = entries.filter(
        (entry) => normalizeHash(entry.skillHash ?? "") !== normalizedHash,
      );
      if (remaining.length === 0) await env.SESSIONS.delete(key);
      else await env.SESSIONS.put(key, JSON.stringify(remaining), {
        expirationTtl: YEAR,
      });
    }),
  );
}

export interface SourceIndexEntry {
  skillHash: string;
  title: string;
  sourceUrl: string;
  /** Added for new records; legacy domain entries may not have one. */
  canonicalSourceId?: string;
  fittedTo: string;
  forgedAt: string;
}

/** Add a public artifact to the source-domain discovery indexes. */
export async function addSkillToSourceIndexes(
  env: Env,
  sourceUrls: readonly string[],
  entry: Omit<SourceIndexEntry, "sourceUrl">,
): Promise<void> {
  const sources = await canonicalSources(sourceUrls);
  await Promise.all(
    sources.map(async (source) => {
      const key = `source:${source.domain}`;
      const existing = (await env.SESSIONS.get(key, "json")) as SourceIndexEntry[] | null;
      const entries = existing ?? [];
      if (
        !entries.some(
          (item) =>
            item.skillHash === entry.skillHash &&
            (item.canonicalSourceId ?? source.id) === source.id,
        )
      ) {
        entries.push({
          ...entry,
          sourceUrl: source.url,
          canonicalSourceId: source.id,
        });
        await env.SESSIONS.put(key, JSON.stringify(entries), {
          expirationTtl: YEAR,
        });
      }
    }),
  );
}

export type UnlistResult = "ok" | "not_found" | "forbidden";

/**
 * Hide a public artifact from direct pages, pool listings, and source indexes.
 * The record remains as an unlisted tombstone so an immutable attestation is
 * not misrepresented as deleted.
 */
export async function unlistPublicSkill(
  env: Env,
  hash: string,
  ownerId: number,
): Promise<UnlistResult> {
  const key = keyFor(hash);
  const existing = await getStoredSkill(env, hash);
  if (!existing) return "not_found";
  if (existing.ownerId !== ownerId) return "forbidden";

  existing.visibility = "unlisted";
  await env.SESSIONS.put(key, JSON.stringify(existing));
  await removeSkillFromSourceIndexes(env, existing.sourceUrls, hash);
  return "ok";
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
