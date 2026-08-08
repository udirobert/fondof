import type { Env } from "../index.js";
import { cacheGetJson, cachePutJson, sha256Hex } from "./edge-cache.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

const EXA_TTL = 60 * 60 * 24; // 24h

/**
 * Search for existing skills using Exa semantic search.
 * Results cached at the edge to protect EXA_API_KEY quota.
 */
export async function searchExistingSkills(
  query: string,
  env: Env
): Promise<SearchResult[]> {
  if (!env.EXA_API_KEY) return [];

  const cacheKey = `exa:skills:v1:${await sha256Hex(query.trim().toLowerCase())}`;
  const hit = await cacheGetJson<SearchResult[]>(cacheKey);
  if (hit) return hit;

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

    const results = data.results.map((r) => ({
      title: r.title ?? "",
      url: r.url,
      snippet: r.highlights?.[0] ?? "",
      score: r.score,
    }));

    if (results.length > 0) {
      await cachePutJson(cacheKey, results, EXA_TTL);
    }
    return results;
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

  const cacheKey = `exa:sources:v1:${await sha256Hex(query.trim().toLowerCase())}`;
  const hit = await cacheGetJson<SearchResult[]>(cacheKey);
  if (hit) return hit;

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

    const results = data.results.map((r) => ({
      title: r.title ?? "",
      url: r.url,
      snippet: r.highlights?.[0] ?? "",
      score: r.score,
    }));
    if (results.length > 0) {
      await cachePutJson(cacheKey, results, EXA_TTL);
    }
    return results;
  } catch {
    return [];
  }
}
