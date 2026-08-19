/**
 * Sources client — fetch skills forged from a given source domain.
 */

import { API_BASE } from "@/lib/api-base";
import type { EvidenceSummary } from "@/lib/api";

export interface SourceSkillEntry {
  skillHash: string;
  title: string;
  sourceUrl: string;
  canonicalSourceId?: string;
  fittedTo: string;
  forgedAt: string;
  derivedFromSkillHash?: string;
  evidence?: EvidenceSummary;
}

export interface SourceImpactSummary extends EvidenceSummary {
  skillCount: number;
  skillsWithEvidence: number;
  remixCount: number;
  fittedRepoCount: number;
}

export interface SourceResponse {
  domain: string;
  skills: SourceSkillEntry[];
  count: number;
  impact: SourceImpactSummary;
}

/** Fetch all skills forged from a given source domain. */
export async function fetchSourceSkills(
  domain: string,
): Promise<SourceResponse> {
  const empty: SourceResponse = {
    domain,
    skills: [],
    count: 0,
    impact: {
      skillCount: 0,
      skillsWithEvidence: 0,
      remixCount: 0,
      fittedRepoCount: 0,
      claimedUseCount: 0,
      outcomeCount: 0,
      linkedPrCount: 0,
      githubConfirmedPrCount: 0,
      mergedPrCount: 0,
      evidenceScore: 0,
    },
  };

  try {
    const res = await fetch(
      `${API_BASE}/api/sources/${encodeURIComponent(domain)}`,
    );
    if (!res.ok) return empty;
    return { ...empty, ...(await res.json()) } as SourceResponse;
  } catch {
    return empty;
  }
}
