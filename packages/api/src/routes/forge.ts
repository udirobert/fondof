import { Hono } from "hono";
import type { Env } from "../index.js";
import { chat } from "../lib/llm.js";
import { cacheGetJson, cachePutJson, sha256Hex } from "../lib/edge-cache.js";
import { rateLimit } from "../lib/rate-limit-mw.js";

const COMPOSE_SYSTEM = `You are an expert skill author for AI coding agents. Compose a skill that is:
1. Fitted to the target codebase (respects its stack and conventions)
2. Grounded in source material (cites where ideas came from)
3. Actionable (guides agent behavior on real tasks)

Output a complete skill in markdown with sections: Context, Guidance (with code examples), Anti-patterns, References.

When a gapAgainst skill is provided: do NOT restate what that skill already covers. Write a DELTA skill — only the missing guidance, with an "Depends on" section linking the existing skill.`;

export const forgeRoute = new Hono<{ Bindings: Env }>();

const FORGE_TTL = 60 * 60; // 1h — same ideas + repo → same draft

forgeRoute.post("/forge", rateLimit("forge"), async (c) => {
  const body = await c.req.json<{
    ideas: Array<{ title: string; description: string; sourceUrl: string }>;
    repo?: { name: string; frameworks: string[]; languages: string[] };
    gapAgainst?: { title: string; url: string; snippet?: string };
  }>();

  if (!body.ideas?.length) return c.json({ error: "ideas array is required" }, 400);

  const ideasStr = body.ideas
    .map((i, idx) => `${idx + 1}. ${i.title}: ${i.description}`)
    .join("\n");

  const repoStr = body.repo
    ? `Target: ${body.repo.name} (${body.repo.frameworks.join(", ")}, ${body.repo.languages.join(", ")})`
    : "Target: general TypeScript project";

  const gapStr = body.gapAgainst
    ? `GAP_AGAINST:${body.gapAgainst.url}:${body.gapAgainst.title}:${body.gapAgainst.snippet ?? ""}`
    : "";

  const cacheKey = `forge:v2:${await sha256Hex(`${repoStr}\n${ideasStr}\n${gapStr}`)}`;
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

Write a delta skill: name it with "Gap:" prefix, include a "Depends on" section linking the URL, and only add guidance the existing skill lacks for these ideas / this repo.
`
    : "";

  const prompt = `Compose a skill from these ideas, fitted to the repository:

## Ideas:
${ideasStr}

## ${repoStr}
${gapBlock}
Write the skill as markdown. Include title, Context section, Guidance section with code examples, Anti-patterns section, and References section.`;

  try {
    const skillMarkdown = await chat(c.env.AI, COMPOSE_SYSTEM, prompt, c.env);

    // Extract title from the response
    const titleMatch = skillMarkdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : "Forged Skill";

    // Hash the skill content
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(skillMarkdown));
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
      markdown: skillMarkdown,
      fittedTo: body.repo?.name ?? "general",
      composedAt: new Date().toISOString(),
    };
    await cachePutJson(cacheKey, payload, FORGE_TTL);
    c.header("X-Cache", "MISS");
    return c.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
