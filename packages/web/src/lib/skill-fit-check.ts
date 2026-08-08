/**
 * Honest structural fit heuristics — not a live agent eval on the repo.
 */

import { parseSkillSections } from "@/lib/skill-sections";

export type FitStatus = "pass" | "soft" | "miss";

export interface FitCheckItem {
  id: string;
  label: string;
  status: FitStatus;
  detail: string;
}

export interface SkillFitResult {
  score: number;
  items: FitCheckItem[];
  /** Soft warn when draft is very long */
  longDraft: boolean;
  charCount: number;
}

const LONG_CHARS = 4200;

export function skillFitCheck(opts: {
  markdown: string;
  repo?: string;
  frameworks?: string[];
  isDelta?: boolean;
}): SkillFitResult {
  const md = opts.markdown || "";
  const lower = md.toLowerCase();
  const sections = parseSkillSections(md);
  const kinds = new Set(sections.map((s) => s.kind));

  const hasGuidance = kinds.has("guidance") || /##\s*(guidance|pattern)/i.test(md);
  const hasAnti = kinds.has("anti") || /##\s*anti/i.test(md);
  const hasRefs =
    kinds.has("references") ||
    /##\s*(references|sources)/i.test(md) ||
    /^[-*]\s+https?:\/\//m.test(md);
  const hasDepends = kinds.has("depends") || /##\s*depends/i.test(md);
  const hasGap = kinds.has("gap") || /^#\s*gap:/im.test(md);

  const structureOk = opts.isDelta
    ? (hasGuidance || hasGap) && (hasDepends || hasAnti)
    : hasGuidance && hasAnti;

  const structure: FitCheckItem = {
    id: "structure",
    label: "Structure",
    status: structureOk ? "pass" : hasGuidance || hasAnti ? "soft" : "miss",
    detail: opts.isDelta
      ? structureOk
        ? "Delta sections present"
        : "Need gap guidance + depends / anti-patterns"
      : structureOk
        ? "Guidance + anti-patterns"
        : "Missing Guidance or Anti-patterns",
  };

  const citations: FitCheckItem = {
    id: "citations",
    label: "Citations",
    status: hasRefs || (opts.isDelta && hasDepends) ? "pass" : "soft",
    detail:
      hasRefs || hasDepends
        ? "Sources / depends linked"
        : "Add References so provenance stays clear",
  };

  const repoTokens = [
    ...(opts.repo ? [opts.repo, ...opts.repo.split(/[/\-_]/)] : []),
    ...(opts.frameworks ?? []),
  ]
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 2);

  const repoHits = repoTokens.filter((t) => lower.includes(t)).length;
  const repoFit: FitCheckItem = {
    id: "repo",
    label: "Repo fit",
    status:
      repoTokens.length === 0
        ? "soft"
        : repoHits >= 2
          ? "pass"
          : repoHits === 1
            ? "soft"
            : "miss",
    detail:
      repoTokens.length === 0
        ? "No repo selected"
        : repoHits > 0
          ? `Mentions ${repoHits} stack token${repoHits === 1 ? "" : "s"}`
          : "Draft doesn’t mention this repo’s stack",
  };

  const charCount = md.length;
  const longDraft = charCount > LONG_CHARS;
  const length: FitCheckItem = {
    id: "length",
    label: "Length",
    status: longDraft ? "soft" : charCount > 800 ? "pass" : "soft",
    detail: longDraft
      ? `Long draft (~${Math.round(charCount / 100) / 10}k) — expand sections, don’t read raw`
      : charCount > 800
        ? "Within a tight skill budget"
        : "Short — ok for delta or still composing",
  };

  const items = [structure, citations, repoFit, length];
  if (opts.isDelta || hasGap || hasDepends) {
    items.push({
      id: "delta",
      label: "Delta",
      status: hasDepends || hasGap ? "pass" : "soft",
      detail:
        hasDepends || hasGap
          ? "Gap forge — fills only what’s missing"
          : "Marked delta but depends/gap heading unclear",
    });
  }

  const weights: Record<FitStatus, number> = { pass: 1, soft: 0.55, miss: 0 };
  const score = Math.round(
    (items.reduce((s, i) => s + weights[i.status], 0) / items.length) * 100,
  );

  return { score, items, longDraft, charCount };
}
