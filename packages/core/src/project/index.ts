import type { RepoProfile } from "@fondof/shared";

export interface IndexRepoOptions {
  /** GitHub owner (user or org) */
  owner: string;
  /** Repository name */
  name: string;
  /** GitHub personal access token */
  token: string;
}

/**
 * Index a GitHub repository — detect language, framework, conventions,
 * dependencies, existing skills, and generate a topic embedding.
 */
export async function indexRepo(_options: IndexRepoOptions): Promise<RepoProfile> {
  // TODO: Implement GitHub API integration and repo analysis
  throw new Error("Not yet implemented");
}
