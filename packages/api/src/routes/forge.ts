import { Hono } from "hono";
import type { Env } from "../index.js";
import { chat } from "../lib/llm.js";

const COMPOSE_SYSTEM = `You are an expert skill author for AI coding agents. Compose a skill that is:
1. Fitted to the target codebase (respects its stack and conventions)
2. Grounded in source material (cites where ideas came from)
3. Actionable (guides agent behavior on real tasks)

Output a complete skill in markdown with sections: Context, Guidance (with code examples), Anti-patterns, References.`;

export const forgeRoute = new Hono<{ Bindings: Env }>();

forgeRoute.post("/forge", async (c) => {
  const body = await c.req.json<{
    ideas: Array<{ title: string; description: string; sourceUrl: string }>;
    repo?: { name: string; frameworks: string[]; languages: string[] };
  }>();

  if (!body.ideas?.length) return c.json({ error: "ideas array is required" }, 400);

  const ideasStr = body.ideas
    .map((i, idx) => `${idx + 1}. ${i.title}: ${i.description}`)
    .join("\n");

  const repoStr = body.repo
    ? `Target: ${body.repo.name} (${body.repo.frameworks.join(", ")}, ${body.repo.languages.join(", ")})`
    : "Target: general TypeScript project";

  const prompt = `Compose a skill from these ideas, fitted to the repository:

## Ideas:
${ideasStr}

## ${repoStr}

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

    return c.json({
      title,
      skillHash,
      sourceHashes,
      markdown: skillMarkdown,
      fittedTo: body.repo?.name ?? "general",
      composedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
