/**
 * Exa semantic search provider.
 * Used for:
 * 1. Finding existing skills that match a user's need (skill discovery)
 * 2. Finding source material (podcasts, blogs) about a topic (need-first flow)
 */

export interface ExaSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  score: number;
}

export interface ExaSearchOptions {
  /** Search query — supports long semantic descriptions */
  query: string;
  /** Number of results (default: 10) */
  numResults?: number;
  /** Filter to specific domains */
  includeDomains?: string[];
  /** Exclude specific domains */
  excludeDomains?: string[];
  /** Category filter (e.g. "github", "blog", "podcast") */
  category?: string;
  /** Only return results newer than this date (ISO string) */
  startPublishedDate?: string;
}

/**
 * Search for existing skills across the ecosystem using Exa's semantic search.
 * Targets skill registries, GitHub skill repos, and marketplaces.
 */
export async function searchSkills(query: string, options?: { numResults?: number }): Promise<ExaSearchResult[]> {
  return exaSearch({
    query: `AI agent skill for: ${query}`,
    numResults: options?.numResults ?? 10,
    includeDomains: [
      "github.com",
      "lobehub.com",
      "skills.sh",
      "agentskills.io",
    ],
  });
}

/**
 * Search for source material (podcasts, blogs, articles) about a topic.
 * Used in the need-first flow when the user has a problem and wants relevant content.
 */
export async function searchSourceMaterial(
  query: string,
  options?: { numResults?: number }
): Promise<ExaSearchResult[]> {
  return exaSearch({
    query,
    numResults: options?.numResults ?? 10,
    excludeDomains: [
      "github.com", // exclude code repos, we want content
    ],
    category: "blog",
  });
}

/**
 * Core Exa search call.
 */
async function exaSearch(options: ExaSearchOptions): Promise<ExaSearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    // Gracefully degrade — Exa is optional, return empty results
    return [];
  }

  const body: Record<string, unknown> = {
    query: options.query,
    numResults: options.numResults ?? 10,
    contents: {
      highlights: true,
    },
  };

  if (options.includeDomains?.length) {
    body.includeDomains = options.includeDomains;
  }
  if (options.excludeDomains?.length) {
    body.excludeDomains = options.excludeDomains;
  }
  if (options.category) {
    body.category = options.category;
  }
  if (options.startPublishedDate) {
    body.startPublishedDate = options.startPublishedDate;
  }

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Non-fatal: return empty on API errors
      return [];
    }

    const data = (await response.json()) as {
      results: Array<{
        title: string;
        url: string;
        publishedDate?: string;
        score: number;
        highlights?: string[];
        text?: string;
      }>;
    };

    return data.results.map((r) => ({
      title: r.title ?? "",
      url: r.url,
      snippet: r.highlights?.[0] ?? r.text?.slice(0, 200) ?? "",
      publishedDate: r.publishedDate,
      score: r.score,
    }));
  } catch {
    // Network error — graceful degradation
    return [];
  }
}
