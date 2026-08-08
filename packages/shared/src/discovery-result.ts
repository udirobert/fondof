import type { IdeaRecord } from "./idea-record.js";
import type { RepoProfile } from "./repo-profile.js";

export interface RepoMatch {
  repo: RepoProfile;
  /** Relevance score (0-1) */
  relevanceScore: number;
  /** Specific files/modules where this idea applies */
  specificFiles?: string[];
  /** Human-readable explanation of why this matches */
  rationale: string;
}

export interface ExistingSkillMatch {
  /** Skill identifier */
  skillId: string;
  /** Skill name */
  name: string;
  /** Semantic overlap with the idea (0-1) */
  overlapScore: number;
  /** How well the skill fits the user's environment (0-1) */
  fitScore: number;
  /** Where this skill comes from (registry URL or local path) */
  source: string;
}

export type SkillRecommendation = "forge-skill" | "apply-directly" | "skip";

export interface SkillWorthiness {
  /** Worthiness score (0-1) */
  score: number;
  /** Explanation of the assessment */
  reasoning: string;
  /** What the user should do */
  recommendation: SkillRecommendation;
}

export interface DiscoveryResult {
  /** The idea being evaluated */
  idea: IdeaRecord;
  /** Repos this idea matches against */
  matchedRepos: RepoMatch[];
  /** Existing skills that overlap with this idea */
  existingSkills: ExistingSkillMatch[];
  /** Assessment of whether this idea is worth forging into a skill */
  skillWorthiness: SkillWorthiness;
}
