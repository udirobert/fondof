/**
 * Human skill artifact for on-chain hashes (chain stores hashes only).
 * Persisted via edge Cache API — no KV binding required.
 */

import { cacheGetJson, cachePutJson } from "./edge-cache.js";

export type LandingHitRecord = { path: string; why: string };

export type SkillMetaRecord = {
  title: string;
  blurb?: string;
  repo?: string;
  /** Skill markdown for agent copy / section skim (capped) */
  markdown?: string;
  landings?: LandingHitRecord[];
  frameworks?: string[];
  at: number;
};

const META_TTL = 60 * 60 * 24 * 30; // 30 days
const MARKDOWN_CAP = 12_000;

function metaKey(hash: string) {
  const clean = hash.toLowerCase().replace(/^0x/, "");
  return `skill-meta:v2:${clean}`;
}

export async function getSkillMeta(
  hash: string,
): Promise<SkillMetaRecord | null> {
  return cacheGetJson<SkillMetaRecord>(metaKey(hash));
}

export type SkillMetaInput = {
  title: string;
  blurb?: string;
  repo?: string;
  markdown?: string;
  landings?: LandingHitRecord[];
  frameworks?: string[];
};

export async function putSkillMeta(
  hash: string,
  meta: SkillMetaInput,
): Promise<SkillMetaRecord> {
  const markdown = meta.markdown?.trim();
  const record: SkillMetaRecord = {
    title: meta.title.trim().slice(0, 120) || "Untitled skill",
    blurb: meta.blurb?.trim().slice(0, 200) || undefined,
    repo: meta.repo?.trim().slice(0, 120) || undefined,
    markdown: markdown
      ? markdown.slice(0, MARKDOWN_CAP)
      : undefined,
    landings: meta.landings?.slice(0, 6).map((h) => ({
      path: h.path.slice(0, 80),
      why: h.why.slice(0, 120),
    })),
    frameworks: meta.frameworks?.slice(0, 8).map((f) => f.slice(0, 40)),
    at: Date.now(),
  };
  await cachePutJson(metaKey(hash), record, META_TTL);
  return record;
}

export async function mergeSkillMeta<T extends { skillHash?: string }>(
  skill: T,
  opts?: { includeBody?: boolean },
): Promise<
  T & {
    title?: string;
    blurb?: string;
    repo?: string;
    markdown?: string;
    landings?: LandingHitRecord[];
    frameworks?: string[];
  }
> {
  const hash = skill.skillHash;
  if (!hash) return skill;
  const meta = await getSkillMeta(hash);
  if (!meta) return skill;
  return {
    ...skill,
    title: meta.title,
    blurb: meta.blurb,
    repo: meta.repo,
    landings: meta.landings,
    frameworks: meta.frameworks,
    ...(opts?.includeBody && meta.markdown
      ? { markdown: meta.markdown }
      : {}),
  };
}
