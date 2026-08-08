import type { Env } from "../index.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

/**
 * Search for existing skills using Exa semantic search.
 */
export async function searchExistingSkills(
  query: string,
  env: Env
): Promise<SearchResult[]> {
  if (!env.EXA_API_KEY) return [];

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": env.EXA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `AI agent skill for: ${query}`,
        numResults: 5,
        includeDomains: ["github.com", "lobehub.com", "skills.sh", "agentskills.io"],
        contents: { highlights: true },
      }),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      results: Array<{
        title: string;
        url: string;
        score: number;
        highlights?: string[];
      }>;
    };

    return data.results.map((r) => ({
      title: r.title ?? "",
      url: r.url,
      snippet: r.highlights?.[0] ?? "",
      score: r.score,
    }));
  } catch {
    return [];
  }
}

/**
 * Search for source material (podcasts, blogs) about a topic.
 */
export async function searchSourceMaterial(
  query: string,
  env: Env
): Promise<SearchResult[]> {
  if (!env.EXA_API_KEY) return [];

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": env.EXA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        numResults: 5,
        excludeDomains: ["github.com"],
        category: "blog",
        contents: { highlights: true },
      }),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      results: Array<{
        title: string;
        url: string;
        score: number;
        highlights?: string[];
      }>;
    };

    return data.results.map((r) => ({
      title: r.title ?? "",
      url: r.url,
      snippet: r.highlights?.[0] ?? "",
      score: r.score,
    }));
  } catch {
    return [];
  }
}
