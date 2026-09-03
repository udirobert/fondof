/**
 * Sources client — fetch skills forged from a given source domain.
 */

import { API_BASE, apiFetch } from "@/lib/api-base";
import type { EvidenceSummary } from "@/lib/api";

export interface SourceMeta {
  author?: string;
  siteName?: string;
  show?: string;
  publishedAt?: string;
  feedUrl?: string;
}

export interface SourceSkillEntry {
  skillHash: string;
  title: string;
  sourceUrl: string;
  canonicalSourceId?: string;
  sourceMeta?: SourceMeta;
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

export interface SourceClaim {
  domain: string;
  login: string;
  userId: number;
  status: "self-claimed" | "domain-verified";
  claimedAt: string;
  proofUrl?: string;
  verifiedAt?: string;
}

export interface SourceEntity {
  id: string;
  url: string;
  domain: string;
  meta?: SourceMeta;
  createdAt: string;
  updatedAt?: string;
}

export interface SourceResponse {
  domain: string;
  skills: SourceSkillEntry[];
  count: number;
  impact: SourceImpactSummary;
  claim?: SourceClaim | null;
  source?: SourceEntity;
}

/** Fetch all skills forged from a given source domain. */
export async function fetchSourceSkills(
  domain: string,
): Promise<SourceResponse> {
  const empty: SourceResponse = {
    domain,
    skills: [],
    count: 0,
    claim: null,
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
    const res = await apiFetch(
      `${API_BASE}/api/sources/${encodeURIComponent(domain)}`,
    );
    if (!res.ok) return empty;
    return { ...empty, ...(await res.json()) } as SourceResponse;
  } catch {
    return empty;
  }
}

export async function claimSource(domain: string): Promise<{
  success?: boolean;
  claim?: SourceClaim;
  error?: string;
}> {
  const response = await apiFetch(
    `${API_BASE}/api/sources/${encodeURIComponent(domain)}/claim`,
    { method: "POST" },
  );
  return response.json();
}

export async function createSourceClaimChallenge(domain: string): Promise<{
  success?: boolean;
  token?: string;
  instructions?: string;
  error?: string;
}> {
  const response = await apiFetch(
    `${API_BASE}/api/sources/${encodeURIComponent(domain)}/claim/challenge`,
    { method: "POST" },
  );
  return response.json();
}

export async function verifySourceClaim(
  domain: string,
  proofUrl: string,
): Promise<{ success?: boolean; claim?: SourceClaim; note?: string; error?: string }> {
  const response = await apiFetch(
    `${API_BASE}/api/sources/${encodeURIComponent(domain)}/claim/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    },
  );
  return response.json();
}

/** Fetch a canonical source entity (author/show metadata) and its skills. */
export async function fetchSourceEntity(id: string): Promise<SourceResponse> {
  const empty: SourceResponse = {
    domain: "",
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
    claim: null,
  };

  try {
    const res = await apiFetch(`${API_BASE}/api/source/${encodeURIComponent(id)}`);
    if (!res.ok) return empty;
    return (await res.json()) as SourceResponse;
  } catch {
    return empty;
  }
}
