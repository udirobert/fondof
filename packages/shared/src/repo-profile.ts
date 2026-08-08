export interface LanguageBreakdown {
  language: string;
  /** Percentage of codebase (0-100) */
  percentage: number;
}

export interface Dependency {
  name: string;
  version: string;
}

export interface CodingConventions {
  /** e.g. "anyhow + thiserror", "try/catch with custom Error classes" */
  errorHandling: string;
  /** e.g. "vitest, integration-heavy", "jest + react-testing-library" */
  testing: string;
  /** e.g. "hexagonal, DDD", "MVC", "serverless functions" */
  architecture: string;
}

export interface RepoProfile {
  /** Unique identifier */
  id: string;
  /** Repository name */
  name: string;
  /** GitHub owner (user or org) */
  owner: string;
  /** Full name: owner/name */
  fullName: string;
  /** Language breakdown */
  languages: LanguageBreakdown[];
  /** Detected frameworks (e.g. ["next.js", "tailwind"]) */
  frameworks: string[];
  /** Top-level dependencies */
  dependencies: Dependency[];
  /** Detected coding conventions */
  conventions: CodingConventions;
  /** IDs of skills already installed in this repo */
  existingSkills: string[];
  /** Aggregate embedding of the repo's domain/topics */
  topicEmbedding: number[];
  /** Themes from open issues */
  openIssueThemes: string[];
  /** ISO timestamp of last indexing */
  lastIndexed: string;
}
