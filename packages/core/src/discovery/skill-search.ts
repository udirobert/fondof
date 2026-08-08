import type { IdeaRecord, ExistingSkillMatch } from "@fondof/shared";

/**
 * Known skill catalogs to search against.
 * In v1, this is a hardcoded list of well-known skills with their metadata.
 * Post-Blitz: integrate with remote registries and use vector similarity.
 */
interface SkillCatalogEntry {
  id: string;
  name: string;
  description: string;
  domains: string[];
  applicability: string[];
  source: string;
}

/**
 * A seed catalog of well-known agent skills for overlap detection.
 * Expanded over time as the registry grows.
 */
const SEED_CATALOG: SkillCatalogEntry[] = [
  {
    id: "error-handling-ts",
    name: "TypeScript Error Handling Patterns",
    description: "Result types, custom error classes, exhaustive error checking in TypeScript",
    domains: ["error-handling", "resilience"],
    applicability: ["typescript", "node"],
    source: "registry:community",
  },
  {
    id: "async-patterns-rs",
    name: "Rust Async Patterns",
    description: "Tokio runtime patterns, async error propagation, cancellation safety",
    domains: ["async", "concurrency"],
    applicability: ["rust", "tokio"],
    source: "registry:community",
  },
  {
    id: "testing-react",
    name: "React Testing Best Practices",
    description: "Component testing with RTL, integration tests, mocking strategies",
    domains: ["testing"],
    applicability: ["react", "typescript", "vitest"],
    source: "registry:community",
  },
  {
    id: "api-design-rest",
    name: "REST API Design Guidelines",
    description: "Resource naming, pagination, error responses, versioning",
    domains: ["api", "architecture"],
    applicability: ["rest", "http"],
    source: "registry:community",
  },
  {
    id: "git-workflow",
    name: "Git Workflow Conventions",
    description: "Branch naming, commit messages, PR templates, merge strategies",
    domains: ["workflow", "git"],
    applicability: ["git"],
    source: "registry:community",
  },
  {
    id: "security-web",
    name: "Web Security Checklist",
    description: "XSS prevention, CSRF, CSP headers, input validation, auth patterns",
    domains: ["security", "web"],
    applicability: ["web", "javascript", "typescript"],
    source: "registry:community",
  },
  {
    id: "observability",
    name: "Observability & Logging Patterns",
    description: "Structured logging, tracing, metrics, error reporting conventions",
    domains: ["observability", "logging", "monitoring"],
    applicability: ["distributed-systems", "microservices"],
    source: "registry:community",
  },
  {
    id: "database-migrations",
    name: "Database Migration Best Practices",
    description: "Zero-downtime migrations, rollback strategies, schema versioning",
    domains: ["database", "migrations"],
    applicability: ["sql", "postgresql", "prisma"],
    source: "registry:community",
  },
];

/**
 * Search for existing skills that overlap with an extracted idea.
 * Uses keyword/tag matching in v1; will use vector similarity post-Blitz.
 */
export function searchExistingSkills(idea: IdeaRecord): ExistingSkillMatch[] {
  const matches: ExistingSkillMatch[] = [];

  const ideaDomains = new Set(idea.idea.domain.map((d) => d.toLowerCase()));
  const ideaApplicability = new Set(idea.idea.applicability.map((a) => a.toLowerCase()));

  for (const entry of SEED_CATALOG) {
    const overlapScore = computeOverlap(ideaDomains, ideaApplicability, entry);

    if (overlapScore > 0.2) {
      matches.push({
        skillId: entry.id,
        name: entry.name,
        overlapScore,
        fitScore: computeFitScore(ideaApplicability, entry),
        source: entry.source,
      });
    }
  }

  return matches.sort((a, b) => b.overlapScore - a.overlapScore);
}

/**
 * Compute semantic overlap between an idea and a catalog entry.
 */
function computeOverlap(
  ideaDomains: Set<string>,
  ideaApplicability: Set<string>,
  entry: SkillCatalogEntry
): number {
  const entryDomains = new Set(entry.domains);
  const entryApplicability = new Set(entry.applicability);

  // Domain overlap (weighted 0.6)
  const domainIntersection = setSize(intersection(ideaDomains, entryDomains));
  const domainUnion = setSize(union(ideaDomains, entryDomains));
  const domainJaccard = domainUnion > 0 ? domainIntersection / domainUnion : 0;

  // Applicability overlap (weighted 0.4)
  const appIntersection = setSize(intersection(ideaApplicability, entryApplicability));
  const appUnion = setSize(union(ideaApplicability, entryApplicability));
  const appJaccard = appUnion > 0 ? appIntersection / appUnion : 0;

  return domainJaccard * 0.6 + appJaccard * 0.4;
}

/**
 * Compute how well a catalog entry fits the user's environment.
 */
function computeFitScore(ideaApplicability: Set<string>, entry: SkillCatalogEntry): number {
  const entryApplicability = new Set(entry.applicability);
  const overlap = setSize(intersection(ideaApplicability, entryApplicability));
  return overlap / Math.max(entryApplicability.size, 1);
}

function intersection<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>();
  for (const item of a) {
    if (b.has(item)) result.add(item);
  }
  return result;
}

function union<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set(a);
  for (const item of b) result.add(item);
  return result;
}

function setSize<T>(s: Set<T>): number {
  return s.size;
}
