import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { firecrawlExtract } from "../search/firecrawl.js";

export interface ExtractedArticle {
  /** Article title */
  title: string;
  /** Author name(s) if detected */
  author: string | null;
  /** Cleaned article text content */
  textContent: string;
  /** Article excerpt/summary */
  excerpt: string | null;
  /** Site name */
  siteName: string | null;
  /** Published date if detected */
  publishedDate: string | null;
}

/**
 * Fetch a URL and extract its readable article content.
 * Tries Firecrawl first (handles JS-heavy sites), falls back to local Readability.
 */
export async function extractArticle(url: string): Promise<ExtractedArticle> {
  // Try Firecrawl first (more robust, handles JS rendering)
  const firecrawlResult = await firecrawlExtract(url);
  if (firecrawlResult) {
    return {
      title: firecrawlResult.title,
      author: null, // Firecrawl doesn't extract author separately
      textContent: firecrawlResult.markdown,
      excerpt: firecrawlResult.description ?? null,
      siteName: null,
      publishedDate: null,
    };
  }

  // Fallback: local Readability extraction
  return extractWithReadability(url);
}

/**
 * Local article extraction using Mozilla Readability + jsdom.
 */
async function extractWithReadability(url: string): Promise<ExtractedArticle> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; fondof/0.1; +https://github.com/udirobert/fondof)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error(`Could not extract readable content from ${url}`);
  }

  // Extract published date from meta tags
  const publishedDate = extractPublishedDate(dom);

  return {
    title: article.title,
    author: article.byline,
    textContent: article.textContent.trim(),
    excerpt: article.excerpt,
    siteName: article.siteName,
    publishedDate,
  };
}

/**
 * Try to extract a published date from common meta tags.
 */
function extractPublishedDate(dom: JSDOM): string | null {
  const doc = dom.window.document;

  const selectors = [
    'meta[property="article:published_time"]',
    'meta[name="publication_date"]',
    'meta[name="date"]',
    'meta[property="og:published_time"]',
    'time[datetime]',
  ];

  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    if (el) {
      const value = el.getAttribute("content") || el.getAttribute("datetime");
      if (value) return value;
    }
  }

  return null;
}
