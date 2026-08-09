import { Hono } from "hono";
import type { Env } from "../index.js";
import { chat } from "../lib/llm.js";
import { cacheGetJson, cachePutJson, sha256Hex } from "../lib/edge-cache.js";
import { rateLimit } from "../lib/rate-limit-mw.js";

/** Entry in the source → skills mapping (stored in KV per domain). */
interface SourceEntry {
  skillHash: string;
  title: string;
  sourceUrl: string;
  fittedTo: string;
  forgedAt: string;
}

const COMPOSE_SYSTEM = `You are an expert skill author for AI coding agents. Compose a skill that is:
1. Fitted to the target codebase (respects its stack and conventions)
2. Grounded in source material (cites where ideas came from)
3. Actionable (guides agent behavior on real tasks)
4. SHORT — agents skim; humans decide to publish. Prefer density over length.

Output markdown with EXACTLY these ## sections (plus a single # title):
## Context
## Guidance
## Anti-patterns
## References

Rules:
- Context: 2–4 sentences max.
- Guidance: ONE primary pattern with a small code example (prefer TypeScript). No essay.
- Anti-patterns: 2–4 bullets.
- References: at most 5 bullets (source titles/URLs).
- Total draft under ~3500 characters when possible.
- Do not repeat the same advice in multiple sections.

When a gapAgainst skill is provided: do NOT restate what that skill already covers. Write a DELTA skill — only the missing guidance, with ## Depends on linking the existing skill, then ## Gap to fill, ## Guidance, ## Anti-patterns, ## References. Keep delta skills especially short.`;

export const forgeRoute = new Hono<{ Bindings: Env }>();

const FORGE_TTL = 60 * 60; // 1h — same ideas + repo → same draft

forgeRoute.post("/forge", rateLimit("forge"), async (c) => {
  const body = await c.req.json<{
    ideas: Array<{ title: string; description: string; sourceUrl: string }>;
    repo?: { name: string; frameworks: string[]; languages: string[] };
    gapAgainst?: { title: string; url: string; snippet?: string };
    private?: boolean;
  }>();

  if (!body.ideas?.length) return c.json({ error: "ideas array is required" }, 400);

  const isPrivate = body.private === true;

  const ideasStr = body.ideas
    .map((i, idx) => `${idx + 1}. ${i.title}: ${i.description}`)
    .join("\n");

  const repoStr = body.repo
    ? `Target: ${body.repo.name} (${body.repo.frameworks.join(", ")}, ${body.repo.languages.join(", ")})`
    : "Target: general TypeScript project";

  const gapStr = body.gapAgainst
    ? `GAP_AGAINST:${body.gapAgainst.url}:${body.gapAgainst.title}:${body.gapAgainst.snippet ?? ""}`
    : "";

  const cacheKey = `forge:v3:${await sha256Hex(`${repoStr}\n${ideasStr}\n${gapStr}`)}`;
  const hit = await cacheGetJson<{
    title: string;
    skillHash: string;
    sourceHashes: string[];
    markdown: string;
    fittedTo: string;
    composedAt: string;
  }>(cacheKey);
  if (hit?.markdown) {
    c.header("X-Cache", "HIT");
    return c.json(hit);
  }

  const gapBlock = body.gapAgainst
    ? `
## Existing skill (do not duplicate — forge ONLY the gap)
Title: ${body.gapAgainst.title}
URL: ${body.gapAgainst.url}
Snippet: ${body.gapAgainst.snippet ?? "(none)"}

Write a short delta skill: "# Gap: …", ## Depends on (link URL), ## Gap to fill, ## Guidance (delta only), ## Anti-patterns, ## References.
`
    : "";

  const prompt = `Compose a tight skill from these ideas, fitted to the repository:

## Ideas:
${ideasStr}

## ${repoStr}
${gapBlock}
Write markdown with # title then ## Context, ## Guidance (one code example), ## Anti-patterns, ## References. Stay concise — this is a skill file agents load, not a blog post. Name the target repo in Context.`;

  try {
    const skillMarkdown = await chat(c.env.AI, COMPOSE_SYSTEM, prompt, c.env);

    // Extract title from the response
    const titleMatch = skillMarkdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : "Forged Skill";

    // Add attribution preamble
    const sourceUrls = [...new Set(body.ideas.map((i) => i.sourceUrl))];
    const sourceList = sourceUrls
      .filter((u) => u && !u.startsWith("https://fondof.local"))
      .map((u) => `  - ${u}`)
      .join("\n");
    const repoLabel = body.repo?.name ?? "general";

    const preamble = `<!-- Forged with fondof | Fitted for: ${repoLabel} | Sources:\n${sourceList || "  - (direct input)"}\n-->\n\n`;
    const attribution = `\n\n---\n*Forged with [fondof](https://fondof.netlify.app) · Fitted for ${repoLabel}*\n`;

    const fullMarkdown = preamble + skillMarkdown + attribution;

    // Hash the skill content
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(fullMarkdown));
    const skillHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Source hashes from the ideas
    const sourceHashes = [...new Set(body.ideas.map((i) => i.sourceUrl))].map((url) => {
      // Simple hash of the URL for provenance linking
      let hash = 0;
      for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
      }
      return Math.abs(hash).toString(16).padStart(64, "0");
    });

    const payload = {
      title,
      skillHash,
      sourceHashes,
      markdown: fullMarkdown,
      fittedTo: body.repo?.name ?? "general",
      composedAt: new Date().toISOString(),
      private: isPrivate,
    };
    await cachePutJson(cacheKey, payload, FORGE_TTL);

    // Track source → skill mappings for /from/[source] pages (skip if private)
    if (!isPrivate) {
      const realSources = sourceUrls.filter(
        (u) => u && !u.startsWith("https://fondof.local") && u.startsWith("http"),
      );
      for (const url of realSources) {
        try {
          const domain = new URL(url).hostname.replace(/^www\./, "");
          const sourceKey = `source:${domain}`;
          const existing =
            (await c.env.SESSIONS.get(sourceKey, "json")) as SourceEntry[] | null;
          const entries = existing || [];
          if (!entries.some((e) => e.skillHash === skillHash)) {
            entries.push({
              skillHash,
              title,
              sourceUrl: url,
              fittedTo: body.repo?.name ?? "general",
              forgedAt: new Date().toISOString(),
            });
            await c.env.SESSIONS.put(sourceKey, JSON.stringify(entries), {
              expirationTtl: 60 * 60 * 24 * 365,
            });
          }
        } catch {
          // Skip malformed URLs
        }
      }
    }

    c.header("X-Cache", "MISS");
    return c.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
