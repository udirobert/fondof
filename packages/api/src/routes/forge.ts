import { Hono } from "hono";
import type { Env } from "../index.js";
import { chat } from "../lib/llm.js";
import { cacheGetJson, cachePutJson, sha256Hex } from "../lib/edge-cache.js";
import {
  addSkillToSourceIndexes,
  getPublicSkill,
  recordPublicSkillIfActorAllowed,
} from "../lib/skill-registry.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import { clientIp } from "../lib/rate-limit.js";
import { canonicalSources, type CanonicalSource } from "../lib/source-url.js";
import { meteredGenerate } from "../lib/forge-quota.js";
import { resolveSession } from "./auth.js";

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
- Guidance: ONE primary pattern with a small TypeScript example. Use only repository files, APIs, packages, and endpoints explicitly named in the target or ideas. If no verified API is provided, use a self-contained function with no imports.
- Anti-patterns: 2–4 bullets.
- References: at most 5 bullets. Cite only the source titles and URLs supplied in the ideas; never invent documentation URLs, package names, imports, or APIs.
- Total draft under ~3500 characters when possible.
- Do not repeat the same advice in multiple sections.

When a gapAgainst skill is provided: do NOT restate what that skill already covers. Write a DELTA skill — only the missing guidance, with ## Depends on linking the existing skill, then ## Gap to fill, ## Guidance, ## Anti-patterns, ## References. Keep delta skills especially short.`;

export const forgeRoute = new Hono<{ Bindings: Env }>();

const FORGE_TTL = 60 * 60; // 1h — same ideas + repo → same draft

export interface ForgeInput {
  ideas: Array<{
    title: string;
    description: string;
    sourceUrl: string;
    sourceHash?: string;
    domains?: string[];
    applicability?: string[];
    patternType?: string;
  }>;
  repo?: { name: string; frameworks: string[]; languages: string[] };
  gapAgainst?: { title: string; url: string; snippet?: string };
  derivedFromSkillHash?: string;
  /** Explicit false shares publicly; omitted/true keeps the draft private. */
  private?: boolean;
  owner?: { userId: number; login: string };
}

export interface ForgePayload {
  title: string;
  skillHash: string;
  sourceHashes: string[];
  markdown: string;
  fittedTo: string;
  composedAt: string;
  private: boolean;
  sourceUrls: string[];
  canonicalSources: CanonicalSource[];
  domains: string[];
  patternTypes: string[];
  derivedFromSkillHash?: string;
}

function httpSourceUrls(body: ForgeInput): string[] {
  return [...new Set(body.ideas.map((idea) => idea.sourceUrl))].filter(
    (url) => url.startsWith("http") && !url.startsWith("https://fondof.local"),
  );
}

/**
 * Public /s/{hash} pages resolve from the durable KV registry first.
 * Only treat a forge as public after that record reads back successfully.
 * Source indexes are optional; a missing share page is not.
 */
async function persistPublicForge(
  env: Env,
  body: ForgeInput,
  payload: ForgePayload,
): Promise<boolean> {
  const sourceUrls = httpSourceUrls(body);
  let wrote: "created" | "updated" | "skipped" | "failed" = "failed";
  try {
    wrote = await recordPublicSkillIfActorAllowed(env, {
      hash: payload.skillHash,
      title: payload.title,
      markdown: payload.markdown,
      repo: body.repo?.name,
      frameworks: body.repo?.frameworks,
      languages: body.repo?.languages,
      sourceUrls,
      canonicalSources: payload.canonicalSources,
      sourceHashes: payload.sourceHashes,
      domains: payload.domains,
      patternTypes: payload.patternTypes,
      derivedFromSkillHash: payload.derivedFromSkillHash,
      composedAt: payload.composedAt,
      ownerId: body.owner?.userId,
      ownerLogin: body.owner?.login,
    });
  } catch {
    wrote = "failed";
  }

  const rec = await getPublicSkill(env, payload.skillHash);
  if (!rec) return false;

  if (wrote === "created" || wrote === "updated") {
    try {
      await addSkillToSourceIndexes(env, sourceUrls, {
        skillHash: payload.skillHash,
        title: payload.title,
        fittedTo: payload.fittedTo,
        forgedAt: payload.composedAt,
      });
    } catch {
      /* discovery indexes are optional once the public record exists */
    }
  }
  return true;
}

async function withPublicRegistry(
  env: Env,
  body: ForgeInput,
  payload: ForgePayload,
  requestedPrivate: boolean,
): Promise<ForgePayload> {
  if (requestedPrivate) return { ...payload, private: true };
  const listed = await persistPublicForge(env, body, payload);
  return { ...payload, private: !listed };
}

/**
 * Core forge logic — shared by POST /forge and POST /compose.
 * Returns the forged skill payload (from cache when available).
 * Throws on LLM failure so callers can map it to a 500.
 * A public request is only marked public after the durable registry reads back.
 */
export async function forgeSkillCore(
  env: Env,
  body: ForgeInput,
): Promise<{ payload: ForgePayload; cacheHit: boolean }> {
  const isPrivate = body.private !== false;

  const ideasStr = body.ideas
    .map(
      (idea, index) =>
        `${index + 1}. ${idea.title}: ${idea.description}\nSource: ${idea.sourceUrl}`,
    )
    .join("\n\n");

  const repoStr = body.repo
    ? `Target: ${body.repo.name} (${body.repo.frameworks.join(", ")}, ${body.repo.languages.join(", ")})`
    : "Target: general TypeScript project";

  const gapStr = body.gapAgainst
    ? `GAP_AGAINST:${body.gapAgainst.url}:${body.gapAgainst.title}:${body.gapAgainst.snippet ?? ""}`
    : "";

  const sourceUrls = [...new Set(body.ideas.map((i) => i.sourceUrl))];
  const canonicalSourceRecords = await canonicalSources(sourceUrls);

  const cacheKey = `forge:v4:${await sha256Hex(
    `${repoStr}\n${ideasStr}\n${gapStr}\nprivate:${isPrivate}`,
  )}`;
  const hit = await cacheGetJson<ForgePayload>(cacheKey);
  if (hit?.markdown) {
    const cachedPayload = hit.canonicalSources
      ? hit
      : { ...hit, canonicalSources: canonicalSourceRecords };
    const payload = await withPublicRegistry(env, body, cachedPayload, isPrivate);
    return { payload, cacheHit: true };
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

  const skillMarkdown = await chat(env.AI, COMPOSE_SYSTEM, prompt, env);

  // Extract title from the response
  const titleMatch = skillMarkdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : "Forged Skill";

  // Add attribution preamble
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

  // Prefer the ingestion pipeline's content hash. Local/demo inputs fall back
  // to a SHA-256 of the source URL so the commitment is collision-resistant.
  const sourceHashes = [
    ...new Set(
      await Promise.all(
        body.ideas.map(async (idea) => {
          const contentHash = idea.sourceHash?.trim();
          if (contentHash && /^[0-9a-f]{64}$/i.test(contentHash)) {
            return contentHash.toLowerCase();
          }
          return sha256Hex(idea.sourceUrl);
        }),
      ),
    ),
  ];

  const payload: ForgePayload = {
    title,
    skillHash,
    sourceHashes,
    markdown: fullMarkdown,
    fittedTo: body.repo?.name ?? "general",
    composedAt: new Date().toISOString(),
    private: isPrivate,
    sourceUrls,
    canonicalSources: canonicalSourceRecords,
    domains: [...new Set(body.ideas.flatMap((idea) => idea.domains ?? []))],
    patternTypes: [
      ...new Set(
        body.ideas
          .map((idea) => idea.patternType)
          .filter((type): type is string => !!type),
      ),
    ],
    derivedFromSkillHash: body.derivedFromSkillHash,
  };
  const confirmed = await withPublicRegistry(env, body, payload, isPrivate);
  await cachePutJson(cacheKey, confirmed, FORGE_TTL);

  return { payload: confirmed, cacheHit: false };
}

forgeRoute.post("/forge", rateLimit("forge"), async (c) => {
  const body = await c.req.json<ForgeInput>();

  if (!body.ideas?.length) return c.json({ error: "ideas array is required" }, 400);

  const session = await resolveSession(c);

  try {
    const metered = await meteredGenerate(
      c.env,
      session,
      clientIp(c.req.raw),
      async () => {
        const { payload, cacheHit } = await forgeSkillCore(c.env, {
          ...body,
          owner: session
            ? { userId: session.userId, login: session.login }
            : undefined,
        });
        return { kind: "ok" as const, cacheHit, value: { payload, cacheHit } };
      },
    );
    if (!metered.ok) {
      return c.json(metered.body, metered.status as 402);
    }
    c.header("X-Cache", metered.value.cacheHit ? "HIT" : "MISS");
    return c.json(metered.value.payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
