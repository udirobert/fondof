import type { Env } from "../index.js";
import { unsafeFetchReason } from "./ssrf.js";

export type ExtractProvider = "firecrawl" | "html";

export type ExtractResult = {
  text: string;
  title: string;
  provider: ExtractProvider;
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
    const result = await firecrawlExtract(url, env.FIRECRAWL_API_KEY);
    if (result) return { ...result, provider: "firecrawl" };
  }

  // Fallback: basic HTML fetch + strip
  const basic = await basicExtract(url);
  return basic ? { ...basic, provider: "html" } : null;
}

async function firecrawlExtract(
  url: string,
  apiKey: string
): Promise<{ text: string; title: string } | null> {
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
        metadata?: { title?: string };
      };
    };

    if (!data.success || !data.data?.markdown) return null;

    return {
      text: data.data.markdown,
      title: data.data.metadata?.title ?? "",
    };
  } catch {
    return null;
  }
}

async function basicExtract(url: string): Promise<{ text: string; title: string } | null> {
  try {
    if (unsafeFetchReason(url)) return null;
    const response = await fetch(url, {
      headers: { "User-Agent": "fondof/0.1 (skill forge)" },
    });
    if (!response.ok) return null;

    const html = await response.text();

    // Extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

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

    return text.length > 100 ? { text, title } : null;
  } catch {
    return null;
  }
}
