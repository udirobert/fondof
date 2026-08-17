import { Hono } from "hono";
import type { Env } from "../index.js";
import { runIngestPipeline, runNeedPipeline, needUrl } from "./ingest.js";
import { forgeSkillCore, type ForgeInput } from "./forge.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import { normalizeSourceUrl } from "../lib/source-url.js";

export const composeRoute = new Hono<{ Bindings: Env }>();

const noopEmit = () => {};

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(Math.floor(n) || min, min), max);

interface ComposeBody {
  url?: string;
  need?: string;
  repo?: ForgeInput["repo"];
  /** Number of top shards to forge. Defaults to 2, max 6. */
  topShards?: number;
  /** Defaults to true — compose is ephemeral; publish separately if desired. */
  private?: boolean;
}

/**
 * One-shot compose for agents:
 *   POST /api/compose { url | need, repo }
 * ingest → top shards → forge → { markdown, ideas, skillHash, sourceUrl }
 */
composeRoute.post("/compose", rateLimit("compose"), async (c) => {
  let body: ComposeBody;
  try {
    body = await c.req.json<ComposeBody>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { url, need, repo } = body;

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

    // 3. Forge via the shared core (same caching as /api/forge)
    const { payload } = await forgeSkillCore(c.env, {
      ideas: topShards.map((i) => ({
        title: i.title,
        description: i.description,
        sourceUrl: i.sourceUrl,
      })),
      repo,
      private: body.private ?? true,
    });

    const sourceUrl = url ? normalizeSourceUrl(url) : needUrl(need!);

    return c.json({
      markdown: payload.markdown,
      ideas: topShards,
      skillHash: payload.skillHash,
      title: payload.title,
      sourceUrl,
      sourceHash: ingestResult.sourceHash,
      contentType: ingestResult.contentType,
      fittedTo: payload.fittedTo,
      ingestCacheHit: !!ingestResult.cacheHit,
      providers: ingestResult.providers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
