import { Hono } from "hono";
import type { Env } from "../index.js";
import { chat, embed } from "../lib/llm.js";

const EXTRACT_SYSTEM = `You are a JSON-only response bot. You extract actionable technical ideas from content.

IMPORTANT: You MUST respond with ONLY a valid JSON array. No explanations, no markdown, no code fences. Just the raw JSON array.

Each idea in the array must have: title (string), description (string), domain (array of strings), applicability (array of strings), patternType (one of: "technique", "mental-model", "anti-pattern", "architecture").

Example response:
[{"title":"Error Boundaries","description":"Use catchError for custom error handling that does not interfere with routing.","domain":["error-handling"],"applicability":["react","next.js"],"patternType":"technique"}]`;

export const ingestRoute = new Hono<{ Bindings: Env }>();

ingestRoute.post("/ingest", async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  if (!url) return c.json({ error: "url is required" }, 400);

  try {
    // Step 1: Fetch and extract article text
    const text = await fetchArticleText(url);
    if (!text) return c.json({ error: "Could not extract content from URL" }, 400);

    // Step 2: Hash the source
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(text));
    const sourceHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Step 3: Extract ideas via LLM
    const truncated = text.slice(0, 12000); // Stay within context
    const llmResponse = await chat(
      c.env.AI,
      EXTRACT_SYSTEM,
      `Extract all actionable technical ideas from this content. Respond with ONLY a JSON array:\n\n${truncated}`,
      c.env
    );

    const responseStr = typeof llmResponse === "string" ? llmResponse : JSON.stringify(llmResponse);
    const ideas = parseIdeas(responseStr, url, sourceHash);

    // Step 4: Generate embeddings
    if (ideas.length > 0) {
      const texts = ideas.map((i) => `${i.title}: ${i.description}`);
      const embeddings = await embed(c.env.AI, texts);
      ideas.forEach((idea, i) => {
        idea.embedding = embeddings[i] ?? [];
      });
    }

    return c.json({
      contentType: "article",
      sourceHash,
      title: extractTitle(text),
      ideas,
      textLength: text.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

async function fetchArticleText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "fondof/0.1 (skill forge)" },
    });
    if (!response.ok) return null;

    const html = await response.text();
    // Simple extraction: strip tags, collapse whitespace
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

    return text.length > 100 ? text : null;
  } catch {
    return null;
  }
}

function extractTitle(text: string): string {
  // Take first meaningful line as title
  const lines = text.split(/[.\n]/).filter((l) => l.trim().length > 5);
  return lines[0]?.trim().slice(0, 100) ?? "Untitled";
}

interface IdeaOutput {
  id: string;
  title: string;
  description: string;
  domain: string[];
  applicability: string[];
  patternType: string;
  sourceUrl: string;
  sourceHash: string;
  embedding: number[];
}

function parseIdeas(response: string, sourceUrl: string, sourceHash: string): IdeaOutput[] {
  // Extract JSON from response (handle code fences)
  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1] : response.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        parsed = JSON.parse(arrMatch[0]);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item: Record<string, unknown>) => item.title && item.description)
    .map((item: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      title: item.title as string,
      description: item.description as string,
      domain: (item.domain as string[]) ?? [],
      applicability: (item.applicability as string[]) ?? [],
      patternType: (item.patternType as string) ?? "technique",
      sourceUrl,
      sourceHash,
      embedding: [],
    }));
}
