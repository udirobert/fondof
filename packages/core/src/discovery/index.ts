import type { IdeaRecord, RepoProfile, DiscoveryResult } from "@fondof/shared";
import type { LLMProvider } from "../ingestion/idea-extractor.js";
import { matchIdeaToRepos } from "./matcher.js";
import { searchExistingSkills, searchExistingSkillsLive } from "./skill-search.js";
import { assessWorthiness } from "./worthiness.js";

export interface DiscoverOptions {
  /** Ideas to match against repos */
  ideas: IdeaRecord[];
  /** User's repo profiles to match against */
  repos: RepoProfile[];
  /** LLM provider for skill-worthiness assessment */
  llm: LLMProvider;
  /** Skip LLM-based worthiness (use heuristic only) for speed */
  skipLlmWorthiness?: boolean;
  /** Use live web search for existing skill discovery (requires Exa/TinyFish API keys) */
  liveSearch?: boolean;
}

/**
 * Match extracted ideas against the user's repositories.
 * Returns discovery results including repo matches, existing skill overlap,
 * and skill-worthiness assessments.
 */
export async function discover(options: DiscoverOptions): Promise<DiscoveryResult[]> {
  const { ideas, repos, llm, skipLlmWorthiness, liveSearch } = options;
  const results: DiscoveryResult[] = [];

  for (const idea of ideas) {
    // 1. Match idea against user's repos
    const matchedRepos = matchIdeaToRepos(idea, repos);

    // 2. Search for existing skills that cover this idea
    const existingSkills = liveSearch
      ? await searchExistingSkillsLive(idea)
      : searchExistingSkills(idea);

    // 3. Assess skill-worthiness
    let skillWorthiness;
    if (skipLlmWorthiness || matchedRepos.length === 0) {
      // Use heuristic when no repo match or speed is preferred
      skillWorthiness = heuristicOnly(idea);
    } else {
      // Use LLM assessment against the best-matched repo
      const bestRepo = matchedRepos[0].repo;
      const existingSkillNames = existingSkills.map((s) => s.name);
      skillWorthiness = await assessWorthiness(idea, bestRepo, existingSkillNames, llm);
    }

    // Adjust worthiness if existing skills already cover this well
    if (existingSkills.length > 0 && existingSkills[0].overlapScore > 0.7) {
      skillWorthiness = {
        ...skillWorthiness,
        score: Math.max(0, skillWorthiness.score - 0.3),
        reasoning: `${skillWorthiness.reasoning} However, existing skill "${existingSkills[0].name}" already covers this well (${Math.round(existingSkills[0].overlapScore * 100)}% overlap).`,
        recommendation: "skip" as const,
      };
    }

    results.push({
      idea,
      matchedRepos,
      existingSkills,
      skillWorthiness,
    });
  }

  // Sort: highest worthiness first
  return results.sort((a, b) => b.skillWorthiness.score - a.skillWorthiness.score);
}

function heuristicOnly(idea: IdeaRecord) {
  if (idea.idea.patternType === "technique" || idea.idea.patternType === "mental-model") {
    return {
      score: 0.7,
      reasoning: `${idea.idea.patternType} patterns are typically repeatable and skill-worthy.`,
      recommendation: "forge-skill" as const,
    };
  }
  if (idea.idea.patternType === "anti-pattern") {
    return {
      score: 0.5,
      reasoning: "Anti-patterns are useful to encode as skills.",
      recommendation: "forge-skill" as const,
    };
  }
  return {
    score: 0.4,
    reasoning: "Architectural decisions are often one-time rather than repeatable.",
    recommendation: "apply-directly" as const,
  };
}
