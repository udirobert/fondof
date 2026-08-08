export interface DemoSource {
  type: "podcast" | "blog" | "text";
  title: string;
  author?: string;
  url: string;
  duration?: string;
  ideasCount?: number;
  isProcessing?: boolean;
}

export interface DemoIdea {
  id: string;
  title: string;
  description: string;
  patternType: "technique" | "mental-model" | "anti-pattern" | "architecture";
  domains: string[];
  worthiness: "forge-skill" | "apply-directly" | "skip";
  worthinessScore: number;
  matchType: "novel" | "partial" | "conflict";
}

export interface DemoRepo {
  name: string;
  fullName: string;
  languages: { language: string; percentage: number }[];
  frameworks: string[];
  matchCount: number;
  lastIndexed: string;
}

export const demoSources: DemoSource[] = [
  {
    type: "podcast",
    title: "Error Handling in Async Systems",
    author: "Software Engineering Daily",
    url: "https://podcast.example/ep-42.mp3",
    duration: "48:12",
    ideasCount: 3,
  },
  {
    type: "blog",
    title: "Next.js 16.3",
    author: "Vercel",
    url: "https://nextjs.org/blog/next-16-3",
    ideasCount: 5,
  },
];

export const demoIdeas: DemoIdea[] = [
  {
    id: "contextual-errors",
    title: "Contextual Error Propagation",
    description:
      "Wrap errors at each async boundary with context about what operation was being attempted. Creates a debugging trail.",
    patternType: "technique",
    domains: ["error-handling", "debugging"],
    worthiness: "forge-skill",
    worthinessScore: 0.85,
    matchType: "novel",
  },
  {
    id: "partial-prefetch",
    title: "Partial Prefetching",
    description:
      "Fine-grained control over how much content a link should prefetch for instant navigations without over-fetching.",
    patternType: "technique",
    domains: ["performance", "ux"],
    worthiness: "forge-skill",
    worthinessScore: 0.72,
    matchType: "partial",
  },
  {
    id: "cache-components",
    title: "Cache Components",
    description:
      "Mark parts of UI as prerenderable with 'use cache' for SPA-like responsiveness in server-rendered apps.",
    patternType: "architecture",
    domains: ["caching", "rendering"],
    worthiness: "apply-directly",
    worthinessScore: 0.45,
    matchType: "partial",
  },
  {
    id: "memory-eviction",
    title: "Memory Eviction in Dev",
    description:
      "Disk caching + memory eviction reduces long-session RAM by 90%. Turbopack-specific optimization.",
    patternType: "technique",
    domains: ["dx", "tooling"],
    worthiness: "skip",
    worthinessScore: 0.2,
    matchType: "conflict",
  },
];

/** Extra ideas used when simulating a fresh ingest during demo / paste. */
export const seededIngestIdeas: DemoIdea[] = [
  {
    id: "retry-budgets",
    title: "Retry Budgets",
    description:
      "Cap aggregate retries across a call graph so cascading failures cannot amplify load. Pair with jittered backoff.",
    patternType: "technique",
    domains: ["reliability", "error-handling"],
    worthiness: "forge-skill",
    worthinessScore: 0.88,
    matchType: "novel",
  },
  {
    id: "error-taxonomy",
    title: "Typed Error Taxonomy",
    description:
      "Separate retryable, user-facing, and fatal errors at the type level so handlers stay honest.",
    patternType: "architecture",
    domains: ["typescript", "error-handling"],
    worthiness: "forge-skill",
    worthinessScore: 0.8,
    matchType: "novel",
  },
  {
    id: "span-context",
    title: "Span-Linked Failures",
    description:
      "Attach the active trace/span id when wrapping errors so ops can jump from log to flamegraph.",
    patternType: "technique",
    domains: ["observability", "debugging"],
    worthiness: "apply-directly",
    worthinessScore: 0.55,
    matchType: "partial",
  },
];

export const seededNeedIdeas: DemoIdea[] = [
  {
    id: "need-circuit-breaker",
    title: "Circuit Breaker for Upstream Calls",
    description:
      "Trip open after consecutive failures; fail fast locally while the dependency recovers.",
    patternType: "technique",
    domains: ["reliability", "resilience"],
    worthiness: "forge-skill",
    worthinessScore: 0.9,
    matchType: "novel",
  },
  {
    id: "need-timeout-budget",
    title: "Timeout Budgets",
    description:
      "Propagate remaining time budget through async calls instead of stacking independent timeouts.",
    patternType: "mental-model",
    domains: ["async", "performance"],
    worthiness: "forge-skill",
    worthinessScore: 0.78,
    matchType: "partial",
  },
];

export const demoRepos: DemoRepo[] = [
  {
    name: "api-gateway",
    fullName: "udirobert/api-gateway",
    languages: [
      { language: "TypeScript", percentage: 78 },
      { language: "Go", percentage: 22 },
    ],
    frameworks: ["Hono", "Workers"],
    matchCount: 2,
    lastIndexed: "2026-08-07T10:00:00Z",
  },
  {
    name: "fondof",
    fullName: "udirobert/fondof",
    languages: [
      { language: "TypeScript", percentage: 85 },
      { language: "Solidity", percentage: 15 },
    ],
    frameworks: ["Next.js", "Tailwind"],
    matchCount: 3,
    lastIndexed: "2026-08-08T14:30:00Z",
  },
];

export function hostnameTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Ingested source";
  }
}

/** Verified live examples for the Fond Floor (one-click ingest). */
export interface LiveExample {
  id: string;
  label: string;
  /** fondof object noun */
  fondObject: string;
  url: string;
  kind: "youtube" | "blog" | "podcast";
}

export const liveExamples: LiveExample[] = [
  {
    id: "ai-company-economics",
    label: "AI company economics",
    fondObject: "the talk",
    url: "https://www.youtube.com/watch?v=mtFvUGTCDBE&t=3s",
    kind: "youtube",
  },
  {
    id: "viem-docs",
    label: "viem docs",
    fondObject: "the piece",
    url: "https://viem.sh/docs/introduction",
    kind: "blog",
  },
  {
    id: "next-blog",
    label: "Next.js blog",
    fondObject: "the blog",
    // Short titles map to fondof · the blog / piece via content type
    url: "https://nextjs.org/blog/next-16-3",
    kind: "blog",
  },
  {
    id: "fireship-talk",
    label: "Fireship talk",
    fondObject: "the talk",
    url: "https://www.youtube.com/watch?v=rZ41y93P2Qo",
    kind: "youtube",
  },
];

export const skillDraftTemplate = (
  ideas: DemoIdea[],
  repo: string,
  gapAgainst?: { title: string; url: string; snippet?: string },
) => {
  const primary = ideas[0]?.title ?? "Composed Skill";
  if (gapAgainst) {
    return `# Gap: ${primary}

## Depends on

- [${gapAgainst.title}](${gapAgainst.url})
${gapAgainst.snippet ? `  - Already covers: ${gapAgainst.snippet.slice(0, 160)}` : ""}

## Gap to fill

${ideas.map((idea) => `- **${idea.title}** — ${idea.description}`).join("\n")}

## Guidance

Add only the missing steps for \`${repo}\`. Do not restate the parent skill.

\`\`\`ts
// delta only — wire into existing patterns in ${repo}
\`\`\`

## Anti-patterns

- Re-forging the parent skill wholesale
- Ignoring stack conventions in \`${repo}\`

## References

- Parent: ${gapAgainst.url}
${ideas.map((idea) => `- ${idea.title}`).join("\n")}
`;
  }
  return `# ${primary}

## Context

Fitted to \`${repo}\` from ${ideas.length} source idea${ideas.length === 1 ? "" : "s"}. Weave selected patterns into this repository — respect stack, conventions, and existing utilities.

## Guidance

Prefer composition over a new global handler.

\`\`\`ts
try {
  await operation();
} catch (err) {
  throw enrichError(err, { op: "operation", repo: "${repo}" });
}
\`\`\`

## Anti-patterns

- Copying generic guidance that ignores \`${repo}\` conventions
- Forging one thin skill per shard instead of composing

## References

${ideas.map((idea) => `- **${idea.title}** — ${idea.description}`).join("\n")}
`;
};

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
