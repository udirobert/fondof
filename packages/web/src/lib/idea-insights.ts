import type { IdeaFromAPI } from "@/lib/api";
import type { ConnectedRepo } from "@/lib/github-repo";
import type { SkillOverlap } from "@/lib/skill-overlap";

export type Worthiness = "forge" | "apply" | "skip";

export interface WorthinessInsight {
  worthiness: Worthiness;
  label: string;
  reason: string;
  /** 0–1 evidence strength for the label */
  confidence: number;
}

export interface RepoMatch {
  fullName: string;
  name: string;
  why: string;
  /** Longer sentence for fit brief */
  detail: string;
  score: number;
}

/**
 * Evidence-based worthiness (not a model guess).
 * Rules fire only when concrete signals are present.
 */
export function scoreWorthiness(idea: IdeaFromAPI): WorthinessInsight {
  const text = `${idea.title} ${idea.description}`.toLowerCase();
  const domains = [...(idea.domain ?? []), ...(idea.applicability ?? [])];
  const descLen = idea.description.trim().length;

  // Skip — one-off / anti-pattern signals
  if (idea.patternType === "anti-pattern") {
    return {
      worthiness: "skip",
      label: "Skip",
      reason: "Marked anti-pattern — document, don’t forge",
      confidence: 0.9,
    };
  }
  if (/one-?off|hotfix|temporary|specific to this|just this once/.test(text)) {
    return {
      worthiness: "skip",
      label: "Skip",
      reason: "Language points to a one-time fix",
      confidence: 0.85,
    };
  }

  // Forge — reusable pattern evidence
  const forgeSignals: string[] = [];
  if (
    idea.patternType === "technique" ||
    idea.patternType === "architecture" ||
    idea.patternType === "mental-model"
  ) {
    forgeSignals.push(idea.patternType.replace("-", " "));
  }
  if (domains.length >= 2) forgeSignals.push(`${domains.length} domains`);
  if (descLen > 140) forgeSignals.push("detailed guidance");
  if (
    /when|always|prefer|pattern|convention|retry|timeout|compose|boundary/.test(
      text,
    )
  ) {
    forgeSignals.push("reusable framing");
  }

  if (forgeSignals.length >= 2) {
    return {
      worthiness: "forge",
      label: "Forge",
      reason: `Evidence: ${forgeSignals.slice(0, 3).join(" · ")}`,
      confidence: Math.min(0.92, 0.55 + forgeSignals.length * 0.1),
    };
  }

  if (forgeSignals.length === 1 && descLen > 80) {
    return {
      worthiness: "forge",
      label: "Forge",
      reason: `Evidence: ${forgeSignals[0]} — forge if you’ll reuse it`,
      confidence: 0.62,
    };
  }

  // Apply — useful but thin reuse signal
  return {
    worthiness: "apply",
    label: "Apply",
    reason:
      domains.length > 0
        ? `Thin reuse signal — apply once in ${domains.slice(0, 2).join(", ")}`
        : "Useful once; forge only if you’ll reuse it",
    confidence: 0.7,
  };
}

/** After Compare: covered shards become Apply; partial keep Forge with gap reason. */
export function refineWorthinessWithOverlap(
  base: WorthinessInsight,
  overlap: SkillOverlap | null | undefined,
): WorthinessInsight {
  if (!overlap) return base;
  if (base.worthiness === "skip") return base;

  if (overlap.label === "covers") {
    return {
      worthiness: "apply",
      label: "Apply",
      reason: `Existing skill covers this (${overlap.method} ${(overlap.score * 100).toFixed(0)}%) — open it or apply once`,
      confidence: Math.max(base.confidence, overlap.method === "embedding" ? 0.88 : 0.75),
    };
  }

  if (overlap.label === "partial" && base.worthiness === "forge") {
    return {
      ...base,
      reason: `Partial overlap — forge a delta vs “${overlap.skill.title.slice(0, 42)}”`,
      confidence: Math.max(base.confidence, 0.7),
    };
  }

  return base;
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
