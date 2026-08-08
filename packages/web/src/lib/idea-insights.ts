import type { IdeaFromAPI } from "@/lib/api";
import type { DemoRepo } from "@/lib/demo-data";

export type Worthiness = "forge" | "apply" | "skip";

export interface WorthinessInsight {
  worthiness: Worthiness;
  label: string;
  reason: string;
}

export interface RepoMatch {
  fullName: string;
  name: string;
  why: string;
}

/** Should you forge this into a skill, apply once, or skip? */
export function scoreWorthiness(idea: IdeaFromAPI): WorthinessInsight {
  const text = `${idea.title} ${idea.description}`.toLowerCase();
  const domains = [...(idea.domain ?? []), ...(idea.applicability ?? [])];

  if (
    idea.patternType === "anti-pattern" ||
    /one-?off|hotfix|temporary|specific to/.test(text)
  ) {
    return {
      worthiness: "skip",
      label: "Skip",
      reason: "Likely a one-time fix — not a reusable skill",
    };
  }

  if (
    idea.patternType === "technique" ||
    idea.patternType === "architecture" ||
    idea.patternType === "mental-model" ||
    domains.length >= 2 ||
    idea.description.length > 120
  ) {
    return {
      worthiness: "forge",
      label: "Forge",
      reason: "Repeatable pattern — strong skill candidate",
    };
  }

  return {
    worthiness: "apply",
    label: "Apply",
    reason: "Useful directly; forge only if you will reuse it",
  };
}

/** Match idea language to connected/demo repos (stack fit). */
export function matchRepos(
  idea: IdeaFromAPI,
  repos: DemoRepo[],
): RepoMatch[] {
  const hay = [
    idea.title,
    idea.description,
    ...(idea.domain ?? []),
    ...(idea.applicability ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const matches: RepoMatch[] = [];

  for (const repo of repos) {
    const hits: string[] = [];
    for (const fw of repo.frameworks) {
      if (hay.includes(fw.toLowerCase())) hits.push(fw);
    }
    for (const lang of repo.languages) {
      if (hay.includes(lang.language.toLowerCase())) hits.push(lang.language);
    }
    // Soft domain bridges for demo repos
    if (
      repo.name === "api-gateway" &&
      /gateway|worker|hono|retry|timeout|circuit|upstream|reliability/.test(hay)
    ) {
      hits.push("reliability");
    }
    if (
      repo.name === "fondof" &&
      /next|react|agent|skill|forge|typescript|monad/.test(hay)
    ) {
      hits.push("stack");
    }

    if (hits.length > 0) {
      matches.push({
        fullName: repo.fullName,
        name: repo.name,
        why: hits.slice(0, 2).join(" · "),
      });
    }
  }

  return matches;
}

export function formatSignal(raw: string | null | undefined): string {
  if (!raw) return "—";
  // Prefer short human signal; wei-scale numbers → eth-ish float
  if (/^\d+$/.test(raw) && raw.length > 12) {
    const asEth = Number(raw) / 1e18;
    if (Number.isFinite(asEth)) return asEth.toPrecision(3);
  }
  return raw;
}
