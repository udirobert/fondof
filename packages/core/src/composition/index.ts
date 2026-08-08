import type { IdeaRecord, RepoProfile, SkillDraft } from "@fondof/shared";
import type { LLMProvider } from "../ingestion/idea-extractor.js";
import { composeSkill } from "./composer.js";
import { detectConflicts, type ConflictResult } from "./conflict-detector.js";

export type { ConflictResult, ConflictDetail } from "./conflict-detector.js";

export interface ComposeOptions {
  /** Ideas to compose into a skill */
  ideas: IdeaRecord[];
  /** Target repository the skill is being fitted to */
  targetRepo: RepoProfile;
  /** LLM provider */
  llm: LLMProvider;
}

export interface ComposeResult {
  /** The drafted skill */
  draft: SkillDraft;
  /** Conflict check results */
  conflicts: ConflictResult;
}

/**
 * Compose a skill from one or more ideas, fitted to the target repository's
 * stack, conventions, and existing patterns.
 *
 * Returns both the draft and any detected conflicts with existing skills.
 */
export async function compose(options: ComposeOptions): Promise<ComposeResult> {
  const { ideas, targetRepo, llm } = options;

  // Compose the skill via LLM
  const draft = await composeSkill({ ideas, targetRepo, llm });

  // Check for conflicts with existing skills
  const conflicts = detectConflicts(draft, targetRepo);

  return { draft, conflicts };
}
