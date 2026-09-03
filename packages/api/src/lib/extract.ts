import type { Env } from "../index.js";
import { safeFetch, validateFetchTarget } from "./ssrf.js";
import type { SourceMeta } from "./source-url.js";

export type ExtractProvider = "firecrawl" | "html";

export type ExtractResult = {
  text: string;
  title: string;
  provider: ExtractProvider;
  sourceMeta?: SourceMeta;
};

/**
 * Extract clean text from a URL.
 * Priority: Firecrawl (handles JS, returns markdown) → basic HTML strip fallback.
 */
export async function extractContent(
  url: string,
  env: Env
): Promise<ExtractResult | null> {
  // Try Firecrawl first (handles JS-rendered pages, returns clean markdown)
  if (env.FIRECRAWL_API_KEY) {
    if (!(await validateFetchTarget(url))) {
      const result = await firecrawlExtract(url, env.FIRECRAWL_API_KEY);
      if (result) return { ...result, provider: "firecrawl" };
    }
  }

  // Fallback: basic HTML fetch + strip
  const basic = await basicExtract(url);
  return basic ? { ...basic, provider: "html" } : null;
}

type RawExtract = {
  text: string;
  title: string;
  sourceMeta?: SourceMeta;
};

async function firecrawlExtract(
  url: string,
  apiKey: string
): Promise<RawExtract | null> {
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
        timeout: 25000,
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      success: boolean;
      data?: {
        markdown?: string;
        metadata?: {
          title?: string;
          author?: string;
          siteName?: string;
          publishedDate?: string;
        };
      };
    };

    if (!data.success || !data.data?.markdown) return null;

    const metadata = data.data.metadata;
    return {
      text: data.data.markdown,
      title: metadata?.title ?? "",
      sourceMeta: {
        author: metadata?.author,
        siteName: metadata?.siteName,
        publishedAt: metadata?.publishedDate,
      },
    };
  } catch {
    return null;
  }
}

function metaContent(html: string, ...patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

async function basicExtract(url: string): Promise<ExtractResult | null> {
  try {
    const fetched = await safeFetch(url, {
      headers: { "User-Agent": "fondof/0.1 (skill forge)" },
    });
    if (!fetched.ok) return null;
    const html = fetched.body;

    // Extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    const author = metaContent(
      html,
      /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']author["']/i,
      /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i,
    );
    const siteName = metaContent(
      html,
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)["']/i,
    );
    const publishedAt = metaContent(
      html,
      /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']publishedDate["'][^>]+content=["']([^"']+)["']/i,
    );

    // Strip to text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length <= 100) return null;

    const sourceMeta: SourceMeta | undefined =
      author || siteName || publishedAt
        ? { author, siteName, publishedAt }
        : undefined;

    return { text, title, provider: "html", sourceMeta };
  } catch {
    return null;
  }
}
