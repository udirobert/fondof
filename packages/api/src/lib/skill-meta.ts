/**
 * Human titles/blurbs for on-chain skills (chain stores hashes only).
 * Persisted via edge Cache API — no KV binding required.
 */

import { cacheGetJson, cachePutJson } from "./edge-cache.js";

export type SkillMetaRecord = {
  title: string;
  blurb?: string;
  repo?: string;
  at: number;
};

const META_TTL = 60 * 60 * 24 * 30; // 30 days

function metaKey(hash: string) {
  const clean = hash.toLowerCase().replace(/^0x/, "");
  return `skill-meta:v1:${clean}`;
}

export async function getSkillMeta(
  hash: string,
): Promise<SkillMetaRecord | null> {
  return cacheGetJson<SkillMetaRecord>(metaKey(hash));
}

export async function putSkillMeta(
  hash: string,
  meta: { title: string; blurb?: string; repo?: string },
): Promise<SkillMetaRecord> {
  const record: SkillMetaRecord = {
    title: meta.title.trim().slice(0, 120) || "Untitled skill",
    blurb: meta.blurb?.trim().slice(0, 200) || undefined,
    repo: meta.repo?.trim().slice(0, 120) || undefined,
    at: Date.now(),
  };
  await cachePutJson(metaKey(hash), record, META_TTL);
  return record;
}

export async function mergeSkillMeta<T extends { skillHash?: string }>(
  skill: T,
): Promise<T & { title?: string; blurb?: string; repo?: string }> {
  const hash = skill.skillHash;
  if (!hash) return skill;
  const meta = await getSkillMeta(hash);
  if (!meta) return skill;
  return {
    ...skill,
    title: meta.title,
    blurb: meta.blurb,
    repo: meta.repo,
  };
}
