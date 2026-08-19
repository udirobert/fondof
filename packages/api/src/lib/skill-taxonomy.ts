export interface SkillTaxonomyInput {
  domains?: readonly string[];
  patternTypes?: readonly string[];
  frameworks?: readonly string[];
  languages?: readonly string[];
  title?: string;
  blurb?: string;
}

export interface SkillGenre {
  slug: string;
  label: string;
  description: string;
}

const DEFINITIONS: Array<SkillGenre & { terms: string[] }> = [
  {
    slug: "reliability",
    label: "Reliability",
    description: "Retries, failure handling, observability, and resilience.",
    terms: [
      "reliab",
      "resilien",
      "retry",
      "error",
      "failure",
      "fault",
      "debug",
      "observab",
      "timeout",
      "backoff",
    ],
  },
  {
    slug: "performance",
    label: "Performance",
    description: "Latency, caching, rendering, scale, and resource efficiency.",
    terms: [
      "performance",
      "latency",
      "cache",
      "render",
      "throughput",
      "optimization",
      "optimiz",
      "scale",
      "speed",
      "memory",
    ],
  },
  {
    slug: "architecture",
    label: "Architecture",
    description: "Boundaries, systems design, APIs, state, and composition.",
    terms: [
      "architecture",
      "distributed",
      "system design",
      "api",
      "service",
      "state",
      "boundary",
      "composition",
      "workflow",
      "pattern",
    ],
  },
  {
    slug: "security",
    label: "Security",
    description: "Auth, privacy, validation, abuse resistance, and trust.",
    terms: [
      "security",
      "secure",
      "auth",
      "privacy",
      "secret",
      "permission",
      "validation",
      "attack",
      "threat",
    ],
  },
  {
    slug: "developer-tools",
    label: "Developer tools",
    description: "Tooling, DX, testing, automation, and agent workflows.",
    terms: [
      "developer",
      "tooling",
      "dx",
      "testing",
      "test",
      "automation",
      "cli",
      "agent",
      "typescript",
      "javascript",
    ],
  },
  {
    slug: "product-and-ux",
    label: "Product & UX",
    description: "Interfaces, accessibility, product behavior, and user experience.",
    terms: [
      "ux",
      "user experience",
      "ui",
      "interface",
      "accessib",
      "product",
      "interaction",
      "design",
      "frontend",
    ],
  },
  {
    slug: "data-and-state",
    label: "Data & state",
    description: "Data flow, persistence, synchronization, and state management.",
    terms: [
      "data",
      "database",
      "storage",
      "persist",
      "synchron",
      "queue",
      "event",
      "stream",
      "state management",
    ],
  },
  {
    slug: "team-practice",
    label: "Team practice",
    description: "Planning, communication, documentation, and reusable practice.",
    terms: [
      "team",
      "process",
      "planning",
      "documentation",
      "decision",
      "communication",
      "review",
      "leadership",
      "mental-model",
    ],
  },
  {
    slug: "general-engineering",
    label: "General engineering",
    description: "Useful engineering practice that does not fit one narrower genre.",
    terms: [],
  },
];

export const SKILL_GENRES: readonly SkillGenre[] = DEFINITIONS.map(
  ({ slug, label, description }) => ({ slug, label, description }),
);

/** Classify from persisted metadata only; no LLM or opaque score is involved. */
export function classifySkillGenres(
  input: SkillTaxonomyInput,
): SkillGenre[] {
  const text = [
    ...(input.domains ?? []),
    ...(input.patternTypes ?? []),
    ...(input.frameworks ?? []),
    ...(input.languages ?? []),
    input.title ?? "",
    input.blurb ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const matches = DEFINITIONS.filter(
    (definition) =>
      definition.terms.length > 0 &&
      definition.terms.some((term) => text.includes(term)),
  );

  const genres = matches.length > 0 ? matches : [DEFINITIONS.at(-1)!];
  return genres.map(({ slug, label, description }) => ({
    slug,
    label,
    description,
  }));
}

export function genreBySlug(slug: string): SkillGenre | null {
  return (
    SKILL_GENRES.find((genre) => genre.slug === slug.trim().toLowerCase()) ??
    null
  );
}
