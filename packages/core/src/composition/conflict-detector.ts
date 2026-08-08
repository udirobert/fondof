import type { SkillDraft, RepoProfile } from "@fondof/shared";

export interface ConflictResult {
  /** Whether conflicts were detected */
  hasConflicts: boolean;
  /** List of detected conflicts */
  conflicts: ConflictDetail[];
}

export interface ConflictDetail {
  /** Type of conflict */
  type: "domain-overlap" | "contradicting-guidance" | "redundant";
  /** The existing skill path that conflicts */
  existingSkillPath: string;
  /** Description of the conflict */
  description: string;
  /** Severity: warn or block */
  severity: "warn" | "block";
}

/**
 * Check a draft skill against existing skills in the target repo.
 * Detects domain overlap, potential contradictions, and redundancy.
 */
export function detectConflicts(draft: SkillDraft, targetRepo: RepoProfile): ConflictResult {
  const conflicts: ConflictDetail[] = [];

  for (const existingPath of targetRepo.existingSkills) {
    // Check domain overlap
    const overlap = checkDomainOverlap(draft, existingPath);
    if (overlap) {
      conflicts.push(overlap);
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Check if the draft's domain overlaps with an existing skill based on path naming.
 */
function checkDomainOverlap(draft: SkillDraft, existingPath: string): ConflictDetail | null {
  const pathLower = existingPath.toLowerCase();
  const draftDomains = draft.domain.map((d) => d.toLowerCase());

  for (const domain of draftDomains) {
    // Check if the existing skill path contains any of the draft's domain keywords
    if (pathLower.includes(domain) || pathLower.includes(domain.replace("-", ""))) {
      return {
        type: "domain-overlap",
        existingSkillPath: existingPath,
        description: `Draft domain "${domain}" overlaps with existing skill at ${existingPath}. Review both to ensure they complement rather than contradict each other.`,
        severity: "warn",
      };
    }
  }

  // Check for common skill file names that might be broad
  const broadSkillFiles = ["SKILL.md", ".cursorrules", "AGENTS.md"];
  if (broadSkillFiles.some((f) => pathLower.endsWith(f.toLowerCase()))) {
    return {
      type: "domain-overlap",
      existingSkillPath: existingPath,
      description: `Existing broad skill file at ${existingPath} may contain overlapping guidance. Review for consistency.`,
      severity: "warn",
    };
  }

  return null;
}
