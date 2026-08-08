import type { IdeaRecord, RepoProfile, DiscoveryResult } from "@fondof/shared";

export interface DiscoverOptions {
  /** Ideas to match against repos */
  ideas: IdeaRecord[];
  /** User's repo profiles to match against */
  repos: RepoProfile[];
}

/**
 * Match extracted ideas against the user's repositories.
 * Returns discovery results including repo matches, existing skill overlap,
 * and skill-worthiness assessments.
 */
export async function discover(_options: DiscoverOptions): Promise<DiscoveryResult[]> {
  // TODO: Implement semantic matching, existing skill search, skill-worthiness
  throw new Error("Not yet implemented");
}
