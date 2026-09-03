import { Hono } from "hono";
import type { Env } from "../index.js";
import { runIngestPipeline, runNeedPipeline, needUrl } from "./ingest.js";
import { forgeSkillCore } from "./forge.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import { clientIp } from "../lib/rate-limit.js";
import { meteredGenerate, grantVerifiedShareBenefit, inspectForgeEntitlement } from "../lib/forge-quota.js";
import { normalizeSourceUrl } from "../lib/source-url.js";
import { resolveRepoContext } from "../lib/repo-context.js";
import { getPublicSkill } from "../lib/skill-registry.js";
import { resolveSession } from "./auth.js";

export const composeRoute = new Hono<{ Bindings: Env }>();

const noopEmit = () => {};
/** Cap multi-source ingest so one compose cannot fan out unboundedly. */
const MAX_COMPOSE_URLS = 4;

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(Math.floor(n) || min, min), max);

interface ComposeBody {
  /** Single source URL (back-compat). Prefer `urls` for multi-source. */
  url?: string;
  /** One or more source URLs — YouTube, blog, docs. Deduped; max 4. */
  urls?: string[];
  need?: string;
  /**
   * Either a full repo object, an "owner/name" ref, a GitHub URL, or a plain
   * name. Refs/URLs are auto-detected (frameworks + languages) via GitHub.
   * Omit to forge without stack fit (agent should prefer git remote owner/name).
   */
  repo?: string | { name: string; frameworks?: string[]; languages?: string[] };
  /** Number of top shards to forge. Defaults to 2 (single) or 3 (multi), max 6. */
  topShards?: number;
  /** Explicit false shares publicly; omitted/true keeps the draft private. */
  private?: boolean;
}

type IngestLike = Awaited<ReturnType<typeof runIngestPipeline>>;

function frontendBase(env: Env): string {
  return (env.FRONTEND_URL || "https://fondof.netlify.app").replace(/\/$/, "");
}

/**
 * Normalize `url` / `urls` into a deduped list. Empty if neither provided.
 */
export function resolveComposeUrls(body: {
  url?: string;
  urls?: string[];
}): string[] {
  const raw: string[] = [];
  if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (typeof u === "string" && u.trim()) raw.push(u.trim());
    }
  }
  if (typeof body.url === "string" && body.url.trim()) {
    raw.push(body.url.trim());
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of raw) {
    const key = normalizeSourceUrl(u);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
    if (out.length >= MAX_COMPOSE_URLS) break;
  }
  return out;
}

/**
 * Ingest one or more URLs; merge ideas. Partial failures are ok if ≥1 source yields ideas.
 */
async function ingestUrls(
  urls: string[],
  env: Env,
): Promise<{
  ideas: IngestLike["ideas"];
  titles: string[];
  sourceUrls: string[];
  sourceHashes: string[];
  textLength: number;
  contentType: string;
  providers: string[];
  cacheHit: boolean;
  failures: Array<{ url: string; error: string }>;
}> {
  const settled = await Promise.allSettled(
    urls.map((u) => runIngestPipeline(u, env, noopEmit)),
  );

  const ideas: IngestLike["ideas"] = [];
  const titles: string[] = [];
  const sourceUrls: string[] = [];
  const sourceHashes: string[] = [];
  const providers: string[] = [];
  const failures: Array<{ url: string; error: string }> = [];
  let textLength = 0;
  let cacheHit = true;
  let contentType = "article";

  settled.forEach((result, i) => {
    const url = urls[i]!;
    if (result.status === "rejected") {
      const msg =
        result.reason instanceof Error
          ? result.reason.message
          : "ingest failed";
      failures.push({ url, error: msg });
      cacheHit = false;
      return;
    }
    const r = result.value;
    if (!r.ideas?.length) {
      failures.push({ url, error: "no ideas extracted" });
      if (!r.cacheHit) cacheHit = false;
      return;
    }
    ideas.push(...r.ideas);
    if (r.title) titles.push(r.title);
    sourceUrls.push(normalizeSourceUrl(url));
    if (r.sourceHash) sourceHashes.push(r.sourceHash);
    textLength += r.textLength ?? 0;
    if (r.providers?.length) providers.push(...r.providers);
    if (!r.cacheHit) cacheHit = false;
    if (i === 0 && r.contentType) contentType = r.contentType;
  });

  if (urls.length > 1 && sourceUrls.length > 1) {
    contentType = "mixed";
  }

  return {
    ideas,
    titles,
    sourceUrls,
    sourceHashes,
    textLength,
    contentType,
    providers: [...new Set(providers)],
    cacheHit: cacheHit && ideas.length > 0,
    failures,
  };
}

/**
 * One-shot compose for agents:
 *   POST /api/compose { url | urls | need, repo? }
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

  const { need } = body;
  const urls = resolveComposeUrls(body);
  const hasUrls = urls.length > 0;
  const hasNeed = typeof need === "string" && need.trim().length > 0;

  if (!hasUrls && !hasNeed) {
    return c.json({ error: "url, urls, or need is required" }, 400);
  }
  if (hasUrls && hasNeed) {
    return c.json(
      { error: "Provide exactly one of url/urls or need" },
      400,
    );
  }
  if (
    Array.isArray(body.urls) &&
    body.urls.filter((u) => typeof u === "string" && u.trim()).length >
      MAX_COMPOSE_URLS
  ) {
    return c.json(
      { error: `urls accepts at most ${MAX_COMPOSE_URLS} sources` },
      400,
    );
  }

  try {
    const session = await resolveSession(
      c.req.header("Authorization"),
      c.env.SESSIONS,
    );

    const metered = await meteredGenerate(
      c.env,
      session,
      clientIp(c.req.raw),
      async () => {
        // 1. Ingest — single need, or one/many URLs merged into one idea pool
        let allCandidateIdeas: IngestLike["ideas"];
        let ingestMeta: {
          title: string;
          textLength: number;
          sourceHash: string;
          contentType: string;
          providers: string[];
          cacheHit: boolean;
          sourceUrls: string[];
          sourceHashes: string[];
          failures: Array<{ url: string; error: string }>;
        };

        if (hasNeed) {
          const ingestResult = await runNeedPipeline(need!, c.env, noopEmit);
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
          allCandidateIdeas = ingestResult.ideas;
          ingestMeta = {
            title: ingestResult.title ?? "",
            textLength: ingestResult.textLength ?? 0,
            sourceHash: ingestResult.sourceHash ?? "",
            contentType: ingestResult.contentType ?? "need",
            providers: ingestResult.providers ?? [],
            cacheHit: !!ingestResult.cacheHit,
            sourceUrls: [needUrl(need!)],
            sourceHashes: ingestResult.sourceHash
              ? [ingestResult.sourceHash]
              : [],
            failures: [],
          };
        } else {
          const merged = await ingestUrls(urls, c.env);
          if (!merged.ideas.length) {
            return {
              kind: "reject" as const,
              status: 422,
              body: {
                error:
                  "No ideas could be extracted from the source. Try a different URL or a more detailed need.",
                failures: merged.failures,
              },
            };
          }
          allCandidateIdeas = merged.ideas;
          ingestMeta = {
            title: merged.titles.join(" + "),
            textLength: merged.textLength,
            sourceHash: merged.sourceHashes[0] ?? "",
            contentType: merged.contentType,
            providers: merged.providers,
            cacheHit: merged.cacheHit,
            sourceUrls: merged.sourceUrls,
            sourceHashes: merged.sourceHashes,
            failures: merged.failures,
          };
        }

        // 2. Repo context — agents can just say "owner/name"; we detect the stack.
        const repo = await resolveRepoContext(body.repo, c.env.SESSIONS);

        // 3. Rank forge-worthy shards against repo context (if provided)
        const rankedIdeas = rankIdeasForRepo(allCandidateIdeas, repo);

        const defaultTop = ingestMeta.sourceUrls.length > 1 ? 3 : 2;
        const topN = clamp(body.topShards ?? defaultTop, 1, 6);
        const topShards = rankedIdeas.slice(0, topN);

        // 4. Forge via the shared core (same caching as /api/forge).
        //    A compose is private by default for signed-in users (they can
        //    view it later). Anonymous users cannot own private drafts, so
        //    their compose is public by default so the shareable link works.
        let isPrivate = body.private !== false;
        if (!session) isPrivate = false;
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
          cacheHit: ingestMeta.cacheHit && cacheHit,
          value: {
            payload,
            ingestMeta,
            topShards,
            allCandidateIdeas,
          },
        };
      },
    );

    if (!metered.ok) {
      return c.json(metered.body, metered.status as 402 | 422);
    }

    const { payload, ingestMeta, topShards, allCandidateIdeas } =
      metered.value;
    const sourceUrls = ingestMeta.sourceUrls;
    const sourceUrl = sourceUrls[0]!;

    // Advertise /s/{hash} only after the durable public record reads back.
    let shareable = !payload.private;
    let attested = false;
    let entitlement = metered.entitlement;
    if (shareable) {
      const rec = await getPublicSkill(c.env, payload.skillHash);
      shareable = !!rec;
      attested = rec?.onChain ?? false;
      // Signed-in public compose unlocks sharer for the billing month.
      if (
        shareable &&
        session &&
        rec?.ownerId === session.userId
      ) {
        await grantVerifiedShareBenefit(
          c.env.SESSIONS,
          session.userId,
          payload.skillHash,
          "compose-share",
        );
        entitlement = await inspectForgeEntitlement(
          c.env,
          session,
          clientIp(c.req.raw),
        );
      }
    }

    return c.json({
      markdown: payload.markdown,
      ideas: topShards,
      allIdeas: allCandidateIdeas,
      totalIdeasCount: allCandidateIdeas.length,
      sourceTitle: ingestMeta.title,
      textLength: ingestMeta.textLength,
      skillHash: payload.skillHash,
      skillUrl: shareable
        ? `${frontendBase(c.env)}/s/${payload.skillHash}`
        : null,
      title: payload.title,
      canonicalSources: payload.canonicalSources,
      derivedFromSkillHash: payload.derivedFromSkillHash,
      sourceUrl,
      sourceUrls,
      sourceHash: ingestMeta.sourceHash,
      sourceHashes: ingestMeta.sourceHashes,
      contentType: ingestMeta.contentType,
      fittedTo: payload.fittedTo,
      onChain: attested,
      private: !shareable,
      ingestCacheHit: ingestMeta.cacheHit,
      providers: ingestMeta.providers,
      plan: entitlement.plan,
      remaining: entitlement.remaining,
      limit: entitlement.limit,
      ...(ingestMeta.failures.length
        ? { sourceFailures: ingestMeta.failures }
        : {}),
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
