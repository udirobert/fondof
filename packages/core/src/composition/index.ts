import type { IdeaRecord, RepoProfile, SkillDraft } from "@fondof/shared";

export interface ComposeOptions {
  /** Ideas to compose into a skill */
  ideas: IdeaRecord[];
  /** Target repository the skill is being fitted to */
  targetRepo: RepoProfile;
}

/**
 * Compose a skill from one or more ideas, fitted to the target repository's
 * stack, conventions, and existing patterns.
 */
export async function compose(_options: ComposeOptions): Promise<SkillDraft> {
  // TODO: Implement multi-source composition with environment fitting
  throw new Error("Not yet implemented");
}
