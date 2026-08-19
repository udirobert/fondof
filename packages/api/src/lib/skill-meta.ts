/**
 * Human skill artifact for on-chain hashes (chain stores hashes only).
 * Persisted via edge Cache API — no KV binding required.
 */

import { cacheGetJson, cachePutJson } from "./edge-cache.js";

export type LandingHitRecord = { path: string; why: string };

/** What the skill resulted in — honest optional receipts, not fake metrics. */
export type SkillOutcomeRecord = {
  note: string;
  prUrl?: string;
  screenshotUrl?: string;
};

export type SkillMetaRecord = {
  title: string;
  blurb?: string;
  repo?: string;
  /** Skill markdown for agent copy / section skim (capped) */
  markdown?: string;
  landings?: LandingHitRecord[];
  frameworks?: string[];
  outcome?: SkillOutcomeRecord;
  /** ElevenAgent share URL created via Hosted MCP — optional, set after agent creation */
  agentUrl?: string;
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
  title?: string;
  blurb?: string;
  repo?: string;
  markdown?: string;
  landings?: LandingHitRecord[];
  frameworks?: string[];
  /** Pass to set/replace; omit to keep existing */
  outcome?: SkillOutcomeRecord | null;
  /** ElevenAgent share URL; pass empty string to clear */
  agentUrl?: string | null;
};

function sanitizeHttpUrl(raw: string | undefined, max = 500): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString().slice(0, max);
  } catch {
    return undefined;
  }
}

function sanitizeOutcome(
  outcome: SkillOutcomeRecord | null | undefined,
): SkillOutcomeRecord | undefined {
  if (outcome === null || outcome === undefined) return undefined;
  const note = outcome.note?.trim().slice(0, 280);
  if (!note || note.length < 8) return undefined;
  return {
    note,
    prUrl: sanitizeHttpUrl(outcome.prUrl),
    screenshotUrl: sanitizeHttpUrl(outcome.screenshotUrl),
  };
}

/**
 * Upsert meta. Omitted fields keep prior values so outcome-only / draft
 * re-attach updates do not wipe the rest of the artifact.
 */
export async function putSkillMeta(
  hash: string,
  meta: SkillMetaInput,
): Promise<SkillMetaRecord> {
  const existing = await getSkillMeta(hash);
  const title =
    meta.title?.trim().slice(0, 120) ||
    existing?.title?.trim() ||
    "Untitled skill";

  const markdown =
    meta.markdown !== undefined
      ? meta.markdown.trim()
        ? meta.markdown.trim().slice(0, MARKDOWN_CAP)
        : undefined
      : existing?.markdown;

  const landings =
    meta.landings !== undefined
      ? meta.landings.slice(0, 6).map((h) => ({
          path: h.path.slice(0, 80),
          why: h.why.slice(0, 120),
        }))
      : existing?.landings;

  const frameworks =
    meta.frameworks !== undefined
      ? meta.frameworks.slice(0, 8).map((f) => f.slice(0, 40))
      : existing?.frameworks;

  let outcome: SkillOutcomeRecord | undefined;
  if (meta.outcome === null) {
    outcome = undefined;
  } else if (meta.outcome !== undefined) {
    outcome = sanitizeOutcome(meta.outcome);
  } else {
    outcome = existing?.outcome;
  }

  let agentUrl: string | undefined;
  if (meta.agentUrl === null || meta.agentUrl === "") {
    agentUrl = undefined;
  } else if (meta.agentUrl !== undefined) {
    agentUrl = sanitizeHttpUrl(meta.agentUrl, 600);
  } else {
    agentUrl = existing?.agentUrl;
  }

  const record: SkillMetaRecord = {
    title,
    blurb:
      meta.blurb !== undefined
        ? meta.blurb.trim().slice(0, 200) || undefined
        : existing?.blurb,
    repo:
      meta.repo !== undefined
        ? meta.repo.trim().slice(0, 120) || undefined
        : existing?.repo,
    markdown,
    landings,
    frameworks,
    outcome,
    agentUrl,
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
    outcome?: SkillOutcomeRecord;
    agentUrl?: string;
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
    outcome: meta.outcome,
    agentUrl: meta.agentUrl,
    ...(opts?.includeBody && meta.markdown
      ? { markdown: meta.markdown }
      : {}),
  };
}
