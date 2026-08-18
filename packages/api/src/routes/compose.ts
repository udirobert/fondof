import { Hono } from "hono";
import type { Env } from "../index.js";
import { runIngestPipeline, runNeedPipeline, needUrl } from "./ingest.js";
import { forgeSkillCore } from "./forge.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import { normalizeSourceUrl } from "../lib/source-url.js";
import { resolveRepoContext } from "../lib/repo-context.js";
import { getPublicSkill } from "../lib/skill-registry.js";
import { resolveSession } from "./auth.js";

export const composeRoute = new Hono<{ Bindings: Env }>();

const noopEmit = () => {};

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(Math.floor(n) || min, min), max);

interface ComposeBody {
  url?: string;
  need?: string;
  /**
   * Either a full repo object, an "owner/name" ref, a GitHub URL, or a plain
   * name. Refs/URLs are auto-detected (frameworks + languages) via GitHub.
   */
  repo?: string | { name: string; frameworks?: string[]; languages?: string[] };
  /** Number of top shards to forge. Defaults to 2, max 6. */
  topShards?: number;
  /** Explicit false shares publicly; omitted/true keeps the draft private. */
  private?: boolean;
}

function frontendBase(env: Env): string {
  return (env.FRONTEND_URL || "https://fondof.netlify.app").replace(/\/$/, "");
}

/**
 * One-shot compose for agents:
 *   POST /api/compose { url | need, repo }
 * ingest → top shards → forge → { markdown, ideas, skillHash, skillUrl, sourceUrl }
 *
 * Private by default: a shareable skillUrl is returned only when the caller
 * explicitly requests a public share; on-chain attestation remains separate.
 */
composeRoute.post("/compose", rateLimit("compose"), async (c) => {
  let body: ComposeBody;
  try {
    body = await c.req.json<ComposeBody>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { url, need } = body;

  if (!url && !need) {
    return c.json({ error: "url or need is required" }, 400);
  }
  if (url && need) {
    return c.json({ error: "Provide exactly one of url or need" }, 400);
  }

  try {
    // 1. Ingest — reuse the exact same pipeline as /api/ingest
    const ingestResult = url
      ? await runIngestPipeline(url, c.env, noopEmit)
      : await runNeedPipeline(need!, c.env, noopEmit);

    if (!ingestResult.ideas?.length) {
      return c.json(
        {
          error:
            "No ideas could be extracted from the source. Try a different URL or a more detailed need.",
        },
        422,
      );
    }

    // 2. Top forge-worthy shards
    const topN = clamp(body.topShards ?? 2, 1, 6);
    const topShards = ingestResult.ideas.slice(0, topN);

    // Repo context — agents can just say "owner/name"; we detect the stack.
    const repo = await resolveRepoContext(body.repo, c.env.SESSIONS);

    // 3. Forge via the shared core (same caching as /api/forge).
    //    A compose is private unless public sharing is explicit.
    const isPrivate = body.private !== false;
    const session = await resolveSession(
      c.req.header("Authorization"),
      c.env.SESSIONS,
    );
    const { payload } = await forgeSkillCore(c.env, {
      ideas: topShards.map((i) => ({
        title: i.title,
        description: i.description,
        sourceUrl: i.sourceUrl,
        sourceHash: i.sourceHash,
        domains: i.domain,
        applicability: i.applicability,
        patternType: i.patternType,
      })),
      repo:
        repo && {
          name: repo.name,
          frameworks: repo.frameworks,
          languages: repo.languages,
        },
      private: isPrivate,
      owner: session
        ? { userId: session.userId, login: session.login }
        : undefined,
    });

    const sourceUrl = url ? normalizeSourceUrl(url) : needUrl(need!);
    const skillUrl = `${frontendBase(c.env)}/s/${payload.skillHash}`;

    // Confirm the durable public record exists only after explicit sharing.
    let attested = false;
    if (!isPrivate) {
      const rec = await getPublicSkill(c.env, payload.skillHash);
      attested = rec?.onChain ?? false;
    }

    return c.json({
      markdown: payload.markdown,
      ideas: topShards,
      skillHash: payload.skillHash,
      skillUrl: isPrivate ? null : skillUrl,
      title: payload.title,
      canonicalSources: payload.canonicalSources,
      derivedFromSkillHash: payload.derivedFromSkillHash,
      sourceUrl,
      sourceHash: ingestResult.sourceHash,
      contentType: ingestResult.contentType,
      fittedTo: payload.fittedTo,
      onChain: attested,
      private: isPrivate,
      ingestCacheHit: !!ingestResult.cacheHit,
      providers: ingestResult.providers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
