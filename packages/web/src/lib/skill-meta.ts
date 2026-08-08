/**
 * Client-side titles/blurbs for on-chain skills (chain only stores hashes).
 * Filled at publish time; used on /pool cards and skill pages.
 */

export type SkillMeta = {
  title: string;
  blurb?: string;
  repo?: string;
  /** True only after a real chain/relayer forge */
  live: boolean;
  at: number;
};

const KEY = "fondof:skill-meta:v1";

function readAll(): Record<string, SkillMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, SkillMeta>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, SkillMeta>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

function normalizeHash(hash: string) {
  return hash.toLowerCase().replace(/^0x/, "");
}

export function rememberSkillMeta(
  hash: string,
  meta: { title: string; blurb?: string; repo?: string; live: boolean },
) {
  const key = normalizeHash(hash);
  if (!key) return;
  const all = readAll();
  all[key] = { ...meta, at: Date.now() };
  writeAll(all);
}

export function getSkillMeta(hash: string): SkillMeta | null {
  const key = normalizeHash(hash);
  if (!key) return null;
  return readAll()[key] ?? null;
}

/** Pull a human title + one-line blurb from forge markdown. */
export function skillPreviewFromMarkdown(
  markdown: string,
  fallbackTitle?: string,
): { title: string; blurb: string } {
  const lines = markdown.split(/\n/).map((l) => l.trim());
  let title =
    fallbackTitle?.trim() ||
    lines
      .find((l) => /^#\s+/.test(l))
      ?.replace(/^#+\s+/, "")
      .replace(/\*+/g, "")
      .trim() ||
    lines
      .find((l) => /^\*\*[^*]+\*\*$/.test(l))
      ?.replace(/\*/g, "")
      .trim() ||
    "Untitled skill";

  // Drop decorative underlines / equals lines from title noise
  title = title.replace(/^=+$/, "").trim() || "Untitled skill";

  const skip = /^(#|\*\*|---+|===+|Context|Guidance|Anti-patterns|References|Depends|Fit)/i;
  let blurb = "";
  let passedTitle = false;
  for (const line of lines) {
    if (!passedTitle) {
      if (line.includes(title.slice(0, 12)) || /^#\s+/.test(line) || /^\*\*/.test(line)) {
        passedTitle = true;
      }
      continue;
    }
    if (!line || skip.test(line) || line.startsWith("```")) continue;
    blurb = line.replace(/\*+/g, "").replace(/^[-*]\s+/, "").trim();
    if (blurb.length > 24) break;
  }

  if (!blurb) {
    blurb = "Ready to score on SkillPool — publish puts skin in escrow.";
  }
  if (blurb.length > 160) blurb = `${blurb.slice(0, 157)}…`;

  return { title, blurb };
}
