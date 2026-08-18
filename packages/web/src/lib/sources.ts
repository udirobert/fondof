/**
 * Sources client — fetch skills forged from a given source domain.
 */

import { API_BASE } from "@/lib/api-base";

export interface SourceSkillEntry {
  skillHash: string;
  title: string;
  sourceUrl: string;
  canonicalSourceId?: string;
  fittedTo: string;
  forgedAt: string;
}

export interface SourceResponse {
  domain: string;
  skills: SourceSkillEntry[];
  count: number;
}

/** Fetch all skills forged from a given source domain. */
export async function fetchSourceSkills(
  domain: string,
): Promise<SourceResponse> {
  try {
    const res = await fetch(
      `${API_BASE}/api/sources/${encodeURIComponent(domain)}`,
    );
    if (!res.ok) return { domain, skills: [], count: 0 };
    return (await res.json()) as SourceResponse;
  } catch {
    return { domain, skills: [], count: 0 };
  }
}
