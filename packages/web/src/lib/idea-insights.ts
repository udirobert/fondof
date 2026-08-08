import type { IdeaFromAPI } from "@/lib/api";
import type { ConnectedRepo } from "@/lib/github-repo";

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
  /** Longer sentence for fit brief */
  detail: string;
  score: number;
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

function repoBlob(repo: ConnectedRepo): string {
  return [
    repo.name,
    repo.fullName,
    repo.description ?? "",
    ...(repo.topics ?? []),
    ...repo.frameworks,
    ...repo.languages.map((l) => l.language),
  ]
    .join(" ")
    .toLowerCase();
}

/** Match idea language to connected/demo repos with a human why. */
export function matchRepos(
  idea: IdeaFromAPI,
  repos: ConnectedRepo[],
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
    for (const topic of repo.topics ?? []) {
      if (topic.length > 2 && hay.includes(topic.toLowerCase())) {
        hits.push(topic);
      }
    }

    // Soft domain bridges
    if (
      /gateway|worker|hono|retry|timeout|circuit|upstream|reliability/.test(
        hay,
      ) &&
      /hono|worker|gateway|go|typescript/.test(repoBlob(repo))
    ) {
      hits.push("reliability patterns");
    }
    if (
      /next|react|agent|skill|forge|typescript|monad/.test(hay) &&
      /next|react|typescript|agent|skill/.test(repoBlob(repo))
    ) {
      hits.push("agent/app stack");
    }
    if (
      repo.description &&
      idea.title
        .toLowerCase()
        .split(/\s+/)
        .some(
          (w) =>
            w.length > 4 && repo.description!.toLowerCase().includes(w),
        )
    ) {
      hits.push("repo description");
    }

    const uniq = [...new Set(hits)];
    if (uniq.length === 0) continue;

    const why = uniq.slice(0, 2).join(" · ");
    const stack = [
      ...repo.frameworks.slice(0, 2),
      ...repo.languages.slice(0, 1).map((l) => l.language),
    ].join(" / ");
    const detail = `Fits ${repo.name}${stack ? ` (${stack})` : ""} — ${why} aligns with this idea.`;

    matches.push({
      fullName: repo.fullName,
      name: repo.name,
      why,
      detail,
      score: uniq.length,
    });
  }

  return matches.sort((a, b) => b.score - a.score);
}

/** Fit sentence for the active repo, or null if weak. */
export function fitForRepo(
  idea: IdeaFromAPI,
  repo: ConnectedRepo | undefined,
): RepoMatch | null {
  if (!repo) return null;
  return matchRepos(idea, [repo])[0] ?? null;
}

export function formatSignal(raw: string | null | undefined): string {
  if (!raw) return "—";
  if (/^\d+$/.test(raw) && raw.length > 12) {
    const asEth = Number(raw) / 1e18;
    if (Number.isFinite(asEth)) return asEth.toPrecision(3);
  }
  return raw;
}
