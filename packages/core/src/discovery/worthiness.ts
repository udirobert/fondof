import type { IdeaRecord, RepoProfile, SkillWorthiness } from "@fondof/shared";
import type { LLMProvider } from "../ingestion/idea-extractor.js";
import {
  ASSESS_WORTHINESS_SYSTEM,
  ASSESS_WORTHINESS_USER,
} from "../prompts/assess-worthiness.prompt.js";

/**
 * Assess whether an idea is worth forging into a skill for a given repo.
 * Uses LLM to classify as: forge-skill, apply-directly, or skip.
 */
export async function assessWorthiness(
  idea: IdeaRecord,
  repo: RepoProfile,
  existingSkills: string[],
  llm: LLMProvider
): Promise<SkillWorthiness> {
  const ideaStr = `Title: ${idea.idea.title}
Description: ${idea.idea.description}
Type: ${idea.idea.patternType}
Domain: ${idea.idea.domain.join(", ")}
Applicability: ${idea.idea.applicability.join(", ")}`;

  const repoStr = `Repo: ${repo.fullName}
Languages: ${repo.languages.map((l) => l.language).join(", ")}
Frameworks: ${repo.frameworks.join(", ")}
Error handling: ${repo.conventions.errorHandling}
Testing: ${repo.conventions.testing}
Architecture: ${repo.conventions.architecture}`;

  const existingStr =
    existingSkills.length > 0
      ? existingSkills.join("\n")
      : "(no existing skills)";

  try {
    const response = await llm.chat(
      ASSESS_WORTHINESS_SYSTEM,
      ASSESS_WORTHINESS_USER({ idea: ideaStr, repoContext: repoStr, existingSkills: existingStr })
    );

    const parsed = extractWorthinessJson(response);
    if (parsed) {
      return parsed;
    }
  } catch {
    // LLM failed, fall back to heuristic
  }

  // Heuristic fallback
  return heuristicWorthiness(idea);
}

/**
 * Extract worthiness JSON from LLM response.
 */
function extractWorthinessJson(response: string): SkillWorthiness | null {
  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1] : response.trim();

  try {
    const data = JSON.parse(jsonStr) as {
      score?: number;
      reasoning?: string;
      recommendation?: string;
    };

    if (
      typeof data.score === "number" &&
      typeof data.reasoning === "string" &&
      typeof data.recommendation === "string"
    ) {
      const recommendation = data.recommendation as "forge-skill" | "apply-directly" | "skip";
      if (["forge-skill", "apply-directly", "skip"].includes(recommendation)) {
        return {
          score: Math.max(0, Math.min(1, data.score)),
          reasoning: data.reasoning,
          recommendation,
        };
      }
    }
  } catch {
    // Try to find JSON object in response
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return extractWorthinessJson(objMatch[0]);
      } catch {
        // Give up
      }
    }
  }

  return null;
}

/**
 * Heuristic-based worthiness when LLM is unavailable.
 */
function heuristicWorthiness(idea: IdeaRecord): SkillWorthiness {
  // Techniques and mental models are usually skill-worthy
  if (idea.idea.patternType === "technique" || idea.idea.patternType === "mental-model") {
    return {
      score: 0.7,
      reasoning: `${idea.idea.patternType} patterns are typically repeatable and worth encoding as skills.`,
      recommendation: "forge-skill",
    };
  }

  // Anti-patterns are moderately worth it
  if (idea.idea.patternType === "anti-pattern") {
    return {
      score: 0.5,
      reasoning: "Anti-patterns are useful to encode but have narrower applicability.",
      recommendation: "forge-skill",
    };
  }

  // Architecture ideas are often one-time decisions
  if (idea.idea.patternType === "architecture") {
    return {
      score: 0.4,
      reasoning: "Architectural ideas are often one-time decisions rather than repeatable patterns.",
      recommendation: "apply-directly",
    };
  }

  return {
    score: 0.3,
    reasoning: "Unable to determine skill-worthiness with high confidence.",
    recommendation: "apply-directly",
  };
}
