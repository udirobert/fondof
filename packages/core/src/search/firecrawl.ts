/**
 * Firecrawl content extraction provider.
 * Used for robust article extraction — handles JS-heavy pages, returns clean markdown.
 * Falls back to our local Readability implementation when Firecrawl is unavailable.
 */

export interface FirecrawlResult {
  /** Clean markdown content */
  markdown: string;
  /** Page title */
  title: string;
  /** Page description/excerpt */
  description?: string;
  /** Detected language */
  language?: string;
  /** Source URL after any redirects */
  sourceUrl: string;
}

/**
 * Extract clean content from a URL using Firecrawl's scrape API.
 * Returns null if Firecrawl is unavailable (no API key or network error),
 * allowing the caller to fall back to local Readability.
 */
export async function firecrawlExtract(url: string): Promise<FirecrawlResult | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return null; // Graceful fallback — caller uses Readability
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 30000,
      }),
    });

    if (!response.ok) {
      return null; // Fall back to local extraction
    }

    const data = (await response.json()) as {
      success: boolean;
      data?: {
        markdown?: string;
        metadata?: {
          title?: string;
          description?: string;
          language?: string;
          sourceURL?: string;
        };
      };
    };

    if (!data.success || !data.data?.markdown) {
      return null;
    }

    return {
      markdown: data.data.markdown,
      title: data.data.metadata?.title ?? "",
      description: data.data.metadata?.description,
      language: data.data.metadata?.language,
      sourceUrl: data.data.metadata?.sourceURL ?? url,
    };
  } catch {
    return null; // Network error — fall back
  }
}
