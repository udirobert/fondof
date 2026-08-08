/**
 * TinyFish web search and fetch provider.
 * Used as a fallback when Exa is unavailable, or for general web searches.
 * Search and Fetch endpoints are free (no credit card required).
 */

export interface TinyFishSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface TinyFishFetchResult {
  /** Extracted text content */
  content: string;
  /** Page title */
  title: string;
  /** Source URL */
  url: string;
}

/**
 * Search the web using TinyFish.
 * Free tier with generous rate limits.
 */
export async function tinyFishSearch(
  query: string,
  options?: { intent?: string }
): Promise<TinyFishSearchResult[]> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return []; // Graceful degradation
  }

  try {
    const params = new URLSearchParams({ query });
    if (options?.intent) {
      params.set("intent", options.intent);
    }

    const response = await fetch(
      `https://api.search.tinyfish.ai?${params.toString()}`,
      {
        headers: {
          "X-API-Key": apiKey,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      results: Array<{
        title: string;
        url: string;
        snippet: string;
      }>;
    };

    return data.results.map((r) => ({
      title: r.title ?? "",
      url: r.url,
      snippet: r.snippet ?? "",
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch and extract clean content from a URL using TinyFish.
 * Returns null if unavailable.
 */
export async function tinyFishFetch(url: string): Promise<TinyFishFetchResult | null> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const params = new URLSearchParams({ url, format: "text" });

    const response = await fetch(
      `https://api.fetch.tinyfish.ai?${params.toString()}`,
      {
        headers: {
          "X-API-Key": apiKey,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      content?: string;
      title?: string;
      url?: string;
    };

    if (!data.content) {
      return null;
    }

    return {
      content: data.content,
      title: data.title ?? "",
      url: data.url ?? url,
    };
  } catch {
    return null;
  }
}
