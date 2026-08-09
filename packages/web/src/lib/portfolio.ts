/**
 * Portfolio client — fetch a user's published skills for the /u/[login] page.
 */

import { API_BASE } from "@/lib/api-base";

export interface PublishedSkill {
  skillHash: string;
  title: string;
  githubUrl: string;
  type: "gist" | "repo";
  repo?: string;
  path?: string;
  publishedAt: number;
}

export interface PortfolioResponse {
  skills: PublishedSkill[];
  login: string;
}

/** Fetch a user's published skills by their GitHub login. */
export async function fetchPortfolio(
  login: string,
): Promise<PortfolioResponse> {
  try {
    const res = await fetch(
      `${API_BASE}/api/publish/github/skills/${encodeURIComponent(login)}`,
    );
    if (!res.ok) return { skills: [], login };
    return (await res.json()) as PortfolioResponse;
  } catch {
    return { skills: [], login };
  }
}
