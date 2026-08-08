import type { IdeaRecord, RepoProfile, RepoMatch } from "@fondof/shared";
import { cosineSimilarity } from "../embeddings/similarity.js";

/**
 * Match an idea against a set of repos using hybrid scoring:
 * - Structural matching (tags, frameworks, deps)
 * - Vector similarity (embedding cosine distance)
 *
 * The hybrid score weights: 60% structural + 40% semantic (when embeddings available).
 */
export function matchIdeaToRepos(idea: IdeaRecord, repos: RepoProfile[]): RepoMatch[] {
  const matches: RepoMatch[] = [];

  for (const repo of repos) {
    const { score, rationale, specificFiles } = computeMatchScore(idea, repo);

    if (score > 0.1) {
      matches.push({
        repo,
        relevanceScore: score,
        rationale,
        specificFiles,
      });
    }
  }

  return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

interface MatchResult {
  score: number;
  rationale: string;
  specificFiles?: string[];
}

function computeMatchScore(idea: IdeaRecord, repo: RepoProfile): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  const ideaDomains = new Set(idea.idea.domain.map((d) => d.toLowerCase()));
  const ideaApplicability = new Set(idea.idea.applicability.map((a) => a.toLowerCase()));

  // 1. Language match (weight: 0.2)
  const repoLanguages = new Set(repo.languages.map((l) => l.language.toLowerCase()));
  const languageAliases = getLanguageAliases(repoLanguages);

  for (const tag of ideaApplicability) {
    if (repoLanguages.has(tag) || languageAliases.has(tag)) {
      score += 0.2;
      reasons.push(`Language match: ${tag}`);
      break;
    }
  }

  // 2. Framework match (weight: 0.25)
  const repoFrameworks = new Set(repo.frameworks.map((f) => f.toLowerCase()));
  for (const tag of ideaApplicability) {
    if (repoFrameworks.has(tag) || frameworkContains(repoFrameworks, tag)) {
      score += 0.25;
      reasons.push(`Framework match: ${tag}`);
      break;
    }
  }

  // 3. Dependency match (weight: 0.2)
  const depNames = new Set(repo.dependencies.map((d) => d.name.toLowerCase()));
  for (const tag of ideaApplicability) {
    if (depNames.has(tag)) {
      score += 0.2;
      reasons.push(`Dependency match: ${tag}`);
      break;
    }
  }

  // 4. Domain/topic overlap (weight: 0.2)
  const repoTopics = extractRepoTopics(repo);
  const domainOverlap = setIntersection(ideaDomains, repoTopics);
  if (domainOverlap.size > 0) {
    score += Math.min(0.2, domainOverlap.size * 0.1);
    reasons.push(`Domain overlap: ${[...domainOverlap].join(", ")}`);
  }

  // 5. Issue theme match (weight: 0.15)
  const issueKeywords = repo.openIssueThemes
    .join(" ")
    .toLowerCase()
    .split(/\W+/);
  const issueKeywordsSet = new Set(issueKeywords.filter((w) => w.length > 3));
  for (const domain of ideaDomains) {
    if (issueKeywordsSet.has(domain) || issueKeywords.some((k) => k.includes(domain))) {
      score += 0.15;
      reasons.push(`Matches open issue theme`);
      break;
    }
  }

  // Cap at 1.0
  score = Math.min(1.0, score);

  // Hybrid: blend structural score with vector similarity if embeddings available
  const hasEmbeddings =
    idea.embedding.length > 0 && repo.topicEmbedding.length > 0;

  if (hasEmbeddings) {
    const vectorScore = Math.max(0, cosineSimilarity(idea.embedding, repo.topicEmbedding));
    // Blend: 60% structural, 40% semantic
    score = score * 0.6 + vectorScore * 0.4;
    if (vectorScore > 0.5) {
      reasons.push(`Semantic similarity: ${Math.round(vectorScore * 100)}%`);
    }
  }

  const rationale =
    reasons.length > 0
      ? reasons.join("; ")
      : "Low structural overlap";

  return { score, rationale };
}

/**
 * Build language aliases (e.g. "typescript" → "ts", "javascript" → "js")
 */
function getLanguageAliases(languages: Set<string>): Set<string> {
  const aliases = new Set<string>();
  const aliasMap: Record<string, string[]> = {
    typescript: ["ts", "node", "nodejs"],
    javascript: ["js", "node", "nodejs"],
    python: ["py"],
    rust: ["rs"],
    go: ["golang"],
    "c++": ["cpp"],
    "c#": ["csharp", "dotnet"],
    ruby: ["rb"],
  };

  for (const lang of languages) {
    const mapped = aliasMap[lang];
    if (mapped) {
      for (const alias of mapped) aliases.add(alias);
    }
  }

  return aliases;
}

/**
 * Check if any framework in the set contains the tag as a substring.
 */
function frameworkContains(frameworks: Set<string>, tag: string): boolean {
  for (const fw of frameworks) {
    if (fw.includes(tag) || tag.includes(fw)) return true;
  }
  return false;
}

/**
 * Extract topic keywords from a repo's metadata.
 */
function extractRepoTopics(repo: RepoProfile): Set<string> {
  const topics = new Set<string>();

  // From conventions
  const conventionWords = [
    repo.conventions.errorHandling,
    repo.conventions.testing,
    repo.conventions.architecture,
  ]
    .join(" ")
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);

  for (const word of conventionWords) {
    topics.add(word);
  }

  // From frameworks
  for (const fw of repo.frameworks) {
    topics.add(fw.toLowerCase());
  }

  // From dependency names (popular ones that indicate domains)
  const domainDeps: Record<string, string[]> = {
    "error-handling": ["sentry", "anyhow", "thiserror", "neverthrow"],
    testing: ["vitest", "jest", "pytest", "mocha"],
    database: ["prisma", "drizzle", "sequelize", "typeorm", "sqlalchemy"],
    auth: ["next-auth", "passport", "clerk", "lucia"],
    api: ["express", "fastify", "hono", "axum", "actix-web", "flask", "fastapi"],
    async: ["tokio", "asyncio"],
    "state-management": ["zustand", "redux", "jotai", "pinia"],
  };

  for (const [domain, depList] of Object.entries(domainDeps)) {
    if (repo.dependencies.some((d) => depList.includes(d.name.toLowerCase()))) {
      topics.add(domain);
    }
  }

  return topics;
}

function setIntersection<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>();
  for (const item of a) {
    if (b.has(item)) result.add(item);
  }
  return result;
}
