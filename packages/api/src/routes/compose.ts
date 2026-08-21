import { Hono } from "hono";
import type { Env } from "../index.js";
import { runIngestPipeline, runNeedPipeline, needUrl } from "./ingest.js";
import { forgeSkillCore } from "./forge.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import { clientIp } from "../lib/rate-limit.js";
import { meteredGenerate } from "../lib/forge-quota.js";
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
 * explicitly requests a public share AND the durable registry record exists.
 * On-chain attestation remains separate.
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
    const session = await resolveSession(
      c.req.header("Authorization"),
      c.env.SESSIONS,
    );

    const metered = await meteredGenerate(
      c.env.SESSIONS,
      session,
      clientIp(c.req.raw),
      async () => {
        // 1. Ingest — reuse the exact same pipeline as /api/ingest
        const ingestResult = url
          ? await runIngestPipeline(url, c.env, noopEmit)
          : await runNeedPipeline(need!, c.env, noopEmit);

        if (!ingestResult.ideas?.length) {
          return {
            kind: "reject" as const,
            status: 422,
            body: {
              error:
                "No ideas could be extracted from the source. Try a different URL or a more detailed need.",
            },
          };
        }

        // 2. Repo context — agents can just say "owner/name"; we detect the stack.
        const repo = await resolveRepoContext(body.repo, c.env.SESSIONS);

        // 3. Rank forge-worthy shards against repo context (if provided)
        const allCandidateIdeas = [...ingestResult.ideas];
        const rankedIdeas = rankIdeasForRepo(allCandidateIdeas, repo);

        const topN = clamp(body.topShards ?? 2, 1, 6);
        const topShards = rankedIdeas.slice(0, topN);

        // 4. Forge via the shared core (same caching as /api/forge).
        //    A compose is private unless public sharing is explicit.
        const isPrivate = body.private !== false;
        const { payload, cacheHit } = await forgeSkillCore(c.env, {
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

        return {
          kind: "ok" as const,
          cacheHit: !!ingestResult.cacheHit && cacheHit,
          value: {
            payload,
            ingestResult,
            topShards,
            allCandidateIdeas,
          },
        };
      },
    );

    if (!metered.ok) {
      return c.json(metered.body, metered.status as 402 | 422);
    }

    const { payload, ingestResult, topShards, allCandidateIdeas } =
      metered.value;
    const sourceUrl = url ? normalizeSourceUrl(url) : needUrl(need!);

    // Advertise /s/{hash} only after the durable public record reads back.
    let shareable = !payload.private;
    let attested = false;
    if (shareable) {
      const rec = await getPublicSkill(c.env, payload.skillHash);
      shareable = !!rec;
      attested = rec?.onChain ?? false;
    }

    return c.json({
      markdown: payload.markdown,
      ideas: topShards,
      allIdeas: allCandidateIdeas,
      totalIdeasCount: allCandidateIdeas.length,
      sourceTitle: ingestResult.title,
      textLength: ingestResult.textLength,
      skillHash: payload.skillHash,
      skillUrl: shareable
        ? `${frontendBase(c.env)}/s/${payload.skillHash}`
        : null,
      title: payload.title,
      canonicalSources: payload.canonicalSources,
      derivedFromSkillHash: payload.derivedFromSkillHash,
      sourceUrl,
      sourceHash: ingestResult.sourceHash,
      contentType: ingestResult.contentType,
      fittedTo: payload.fittedTo,
      onChain: attested,
      private: !shareable,
      ingestCacheHit: !!ingestResult.cacheHit,
      providers: ingestResult.providers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

interface IdeaLike {
  title: string;
  description: string;
  domain?: string[];
  applicability?: string[];
  patternType?: string;
}

function rankIdeasForRepo<T extends IdeaLike>(
  ideas: T[],
  repo?: { frameworks?: string[]; languages?: string[] },
): T[] {
  if (!repo || ((!repo.frameworks || repo.frameworks.length === 0) && (!repo.languages || repo.languages.length === 0))) {
    // Without repo stack, preserve extraction order with slight bonus for actionable patterns
    return [...ideas].sort((a, b) => patternWeight(b.patternType) - patternWeight(a.patternType));
  }

  const fwSet = new Set((repo.frameworks ?? []).map((f) => f.toLowerCase()));
  const langSet = new Set((repo.languages ?? []).map((l) => l.toLowerCase()));

  return [...ideas].sort((a, b) => {
    const scoreA = computeIdeaScore(a, fwSet, langSet);
    const scoreB = computeIdeaScore(b, fwSet, langSet);
    return scoreB - scoreA;
  });
}

function computeIdeaScore(
  idea: IdeaLike,
  repoFrameworks: Set<string>,
  repoLanguages: Set<string>,
): number {
  let score = patternWeight(idea.patternType);

  const applicability = (idea.applicability ?? []).map((a) => a.toLowerCase());
  const domains = (idea.domain ?? []).map((d) => d.toLowerCase());

  for (const tag of applicability) {
    if (repoFrameworks.has(tag)) score += 3.0;
    if (repoLanguages.has(tag)) score += 2.0;
  }

  for (const domain of domains) {
    if (repoFrameworks.has(domain)) score += 2.0;
    if (repoLanguages.has(domain)) score += 1.5;
  }

  return score;
}

function patternWeight(patternType?: string): number {
  switch (patternType) {
    case "technique":
      return 3;
    case "architecture":
      return 2.5;
    case "anti-pattern":
      return 1.5;
    case "mental-model":
      return 1;
    default:
      return 1;
  }
}
