import { Hono } from "hono";
import type { Env } from "../index.js";
import {
  acquireFromChain,
  getSkillFromChain,
  getTopSkillsFromChain,
  useOnChain,
  useStormOnChain,
} from "../lib/monad.js";
import { cacheGetJson, cachePutJson, sha256Hex } from "../lib/edge-cache.js";
import { mergeSkillMeta, putSkillMeta, type LandingHitRecord } from "../lib/skill-meta.js";
import {
  getSkillEvidence,
  summarizeEvidence,
  recordClaimedUse,
  recordOutcome,
  verifyLinkedPr,
} from "../lib/skill-evidence.js";
import {
  addSkillToSourceIndexes,
  getPublicSkill,
  getSkillRecord,
  listPublicSkills,
  patchPublicSkill,
  publicSkillMutationAccess,
  recordPublicSkill,
  unlistPublicSkill,
} from "../lib/skill-registry.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import { grantVerifiedShareBenefit } from "../lib/forge-quota.js";
import { relayerSigningKey, runRelayerWrite } from "../lib/relayer-guard.js";
import {
  classifySkillGenres,
  genreBySlug,
  SKILL_GENRES,
} from "../lib/skill-taxonomy.js";
import { resolveSession } from "./auth.js";

export const skillsRoute = new Hono<{ Bindings: Env }>();

const SKILL_TTL = 60; // KV/Cache min practical TTL
const TOP_TTL = 60;

/**
 * List limits the UI actually requests (peer cards: 4, pool shelf: 8,
 * strips: 5/10/20). Bust all of them so discovery surfaces update instantly.
 */
const POOL_BUST_LIMITS = [4, 5, 8, 10, 20];

const clampLimit = (n: number) =>
  Math.min(Math.max(Number.isFinite(n) ? n : 10, 1), 50);

/**
 * Acquire a skill by on-chain weighted signal (view).
 * Agents discover quality without SEO — Monad thesis demo.
 */
skillsRoute.post("/skills/acquire", rateLimit("acquire"), async (c) => {
  const body = (await c.req
    .json<{ seed?: string }>()
    .catch(() => ({ seed: undefined }))) as { seed?: string };
  try {
    const result = await acquireFromChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_CONTRACT_ADDRESS,
      body.seed,
    );
    if (!result.skill) {
      return c.json({ error: "No skills in pool yet — forge first" }, 404);
    }
    const skill = await mergeSkillMeta(result.skill, { includeBody: true });
    return c.json({
      skillHash: result.skillHash,
      skill,
      seed: result.seed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

/** Store human artifact after wallet forge (relayer publish includes meta in body). */
skillsRoute.post("/skills/:hash/meta", rateLimit("publish"), async (c) => {
  const hash = c.req.param("hash");
  const body = (await c.req
    .json<{
      title?: string;
      blurb?: string;
      repo?: string;
      markdown?: string;
      landings?: LandingHitRecord[];
      frameworks?: string[];
      outcome?: {
        note?: string;
        prUrl?: string;
        screenshotUrl?: string;
      } | null;
      agentUrl?: string | null;
    }>()
    .catch(() => ({ title: undefined }))) as {
    title?: string;
    blurb?: string;
    repo?: string;
    markdown?: string;
    landings?: LandingHitRecord[];
    frameworks?: string[];
    outcome?: {
      note?: string;
      prUrl?: string;
      screenshotUrl?: string;
    } | null;
    agentUrl?: string | null;
  };

  const hasOutcomePatch = body.outcome !== undefined;
  const hasAgentUrlPatch = body.agentUrl !== undefined;
  // Artifact fields other than title are always an artifact edit. A bare title
  // sent alongside an outcome/agentUrl patch is a display hint from the UI
  // panels, not an edit — only count it when it is the primary operation.
  const hasBodyArtifactPatch =
    body.blurb !== undefined ||
    body.repo !== undefined ||
    body.markdown !== undefined ||
    body.landings !== undefined ||
    body.frameworks !== undefined;
  const hasArtifactPatch =
    hasBodyArtifactPatch ||
    (body.title !== undefined && !hasOutcomePatch && !hasAgentUrlPatch);
  const title = body.title?.trim();
  if (!title && !hasOutcomePatch && !hasAgentUrlPatch) {
    return c.json({ error: "title is required" }, 400);
  }
  if (body.outcome && body.outcome !== null) {
    const note = body.outcome.note?.trim() ?? "";
    if (note.length < 8) {
      return c.json({ error: "outcome note is too short" }, 400);
    }
  }

  // Authorization: artifact identity and the agent link are owner-only once a
  // public record exists. Ownerless legacy records are immutable. Outcome
  // evidence stays open because it is the visitor "I used this" loop.
  const session = await resolveSession(
    c.req.header("Authorization"),
    c.env.SESSIONS,
  );
  const existingRecord = await getSkillRecord(c.env, hash);

  if (hasAgentUrlPatch) {
    if (!session) {
      return c.json({ error: "Sign in to attach an agent link" }, 401);
    }
    if (existingRecord) {
      const access = publicSkillMutationAccess(existingRecord, session.userId);
      if (access !== "update") {
        return c.json(
          {
            error:
              access === "immutable"
                ? "This skill has no owner and cannot be rewritten"
                : "Only the owner can change the agent link",
          },
          403,
        );
      }
    }
  }
  if (hasArtifactPatch && existingRecord) {
    const access = publicSkillMutationAccess(existingRecord, session?.userId);
    if (access !== "update") {
      return c.json(
        {
          error:
            access === "immutable"
              ? "This skill has no owner and cannot be rewritten"
              : "Only the owner can edit this skill's artifact",
        },
        403,
      );
    }
  }

  const record = await putSkillMeta(hash, {
    // A title sent with an outcome/agentUrl patch is a display hint — never let
    // it overwrite the stored artifact title; only real artifact edits set it.
    title: hasArtifactPatch ? title : undefined,
    blurb: body.blurb,
    repo: body.repo,
    markdown: body.markdown,
    landings: body.landings,
    frameworks: body.frameworks,
    outcome:
      body.outcome === null
        ? null
        : body.outcome
          ? {
              note: body.outcome.note ?? "",
              prUrl: body.outcome.prUrl,
              screenshotUrl: body.outcome.screenshotUrl,
            }
          : undefined,
    agentUrl: body.agentUrl,
  });

  await patchPublicSkill(c.env, hash, {
    title: hasArtifactPatch ? title : undefined,
    blurb: body.blurb,
    repo: body.repo,
    markdown: body.markdown,
    frameworks: body.frameworks,
  });

  const evidence =
    body.outcome !== undefined
      ? await recordOutcome(
          c.env,
          hash,
          body.outcome === null
            ? null
            : {
                note: body.outcome.note ?? "",
                prUrl: body.outcome.prUrl,
                screenshotUrl: body.outcome.screenshotUrl,
              },
        )
      : await getSkillEvidence(c.env, hash);

  // Bust short skill cache so artifact appears immediately
  await caches.default
    .delete(
      new Request(
        `https://fondof-cache.internal/skill:v4:${hash.toLowerCase()}`,
      ),
    )
    .catch(() => undefined);
  // Best-effort list cache bust (current evidence pool + legacy keys)
  for (const lim of POOL_BUST_LIMITS) {
    for (const sort of ["recent", "impact", "outcomes", "adapted"]) {
      await caches.default
        .delete(
          new Request(
            `https://fondof-cache.internal/skills:pool:v4:${sort}:::::${lim}`,
          ),
        )
        .catch(() => undefined);
    }
    await caches.default
      .delete(new Request(`https://fondof-cache.internal/skills:pool:v1:${lim}`))
      .catch(() => undefined);
    await caches.default
      .delete(new Request(`https://fondof-cache.internal/skills:top:v4:${lim}`))
      .catch(() => undefined);
  }

  return c.json({ success: true, meta: record, evidence });
});

/**
 * Share a private forge as a public offchain artifact. This is intentionally
 * separate from onchain attestation. First share may be anonymous; any later
 * mutation, including re-share, requires the stored owner.
 */
skillsRoute.post("/skills/:hash/share", rateLimit("publish"), async (c) => {
  const hash = c.req.param("hash");
  const body = await c.req
    .json<{
      title: string;
      markdown: string;
      repo?: string;
      frameworks?: string[];
      languages?: string[];
      domains?: string[];
      patternTypes?: string[];
      derivedFromSkillHash?: string;
      canonicalSources?: Array<{ id: string; url: string; domain: string }>;
      sourceUrls?: string[];
      sourceHashes?: string[];
      composedAt?: string;
    }>()
    .catch(() => null);

  if (!body?.title?.trim() || !body.markdown?.trim()) {
    return c.json({ error: "title and markdown are required" }, 400);
  }

  const normalizedHash = hash.toLowerCase().replace(/^0x/, "");
  const contentHash = await sha256Hex(body.markdown);
  if (contentHash !== normalizedHash) {
    return c.json({ error: "markdown does not match skillHash" }, 409);
  }

  const session = await resolveSession(
    c.req.header("Authorization"),
    c.env.SESSIONS,
  );
  const existing = await getSkillRecord(c.env, hash);
  const access = publicSkillMutationAccess(existing, session?.userId);
  if (access === "immutable") {
    return c.json(
      { error: "This skill has no owner and cannot be rewritten" },
      403,
    );
  }
  if (access === "forbidden") {
    return c.json({ error: "Only the owner can update this skill" }, 403);
  }

  const sourceUrls = (body.sourceUrls ?? []).filter((url) =>
    /^https?:\/\//i.test(url),
  );
  const composedAt = body.composedAt ?? new Date().toISOString();
  await recordPublicSkill(c.env, {
    hash: normalizedHash,
    title: body.title,
    markdown: body.markdown,
    repo: body.repo,
    frameworks: body.frameworks,
    languages: body.languages,
    domains: body.domains,
    patternTypes: body.patternTypes,
    derivedFromSkillHash: body.derivedFromSkillHash,
    canonicalSources: body.canonicalSources,
    sourceUrls,
    sourceHashes: body.sourceHashes ?? [],
    composedAt,
    ownerId: session?.userId,
    ownerLogin: session?.login,
  });
  await addSkillToSourceIndexes(c.env, sourceUrls, {
    skillHash: normalizedHash,
    title: body.title,
    fittedTo: body.repo ?? "general",
    forgedAt: composedAt,
  });

  if (session) {
    const rec = await getPublicSkill(c.env, normalizedHash);
    if (rec?.ownerId === session.userId) {
      await grantVerifiedShareBenefit(
        c.env.SESSIONS,
        session.userId,
        normalizedHash,
        "public-share",
      );
    }
  }

  // A newly shared artifact should appear in both discovery modes immediately.
  for (const lim of POOL_BUST_LIMITS) {
    for (const sort of ["recent", "impact", "outcomes", "adapted"]) {
      await caches.default
        .delete(
          new Request(
            `https://fondof-cache.internal/skills:pool:v4:${sort}:::::${lim}`,
          ),
        )
        .catch(() => undefined);
    }
  }

  return c.json({
    success: true,
    skillHash: normalizedHash,
    visibility: "public",
  });
});

/** Hide a public skill from discovery while preserving attestation history. */
skillsRoute.delete(
  "/skills/:hash/visibility",
  rateLimit("publish"),
  async (c) => {
    const session = await resolveSession(
      c.req.header("Authorization"),
      c.env.SESSIONS,
    );
    if (!session) return c.json({ error: "Sign in to manage visibility" }, 401);

    const result = await unlistPublicSkill(
      c.env,
      c.req.param("hash"),
      session.userId,
    );
    if (result === "not_found") return c.json({ error: "Skill not found" }, 404);
    if (result === "forbidden") return c.json({ error: "Not the skill owner" }, 403);

    await caches.default
      .delete(
        new Request(
          `https://fondof-cache.internal/skill:v4:${c.req
            .param("hash")
            .toLowerCase()}`,
        ),
      )
      .catch(() => undefined);
    for (const lim of POOL_BUST_LIMITS) {
      for (const sort of ["recent", "impact", "outcomes", "adapted"]) {
        await caches.default
          .delete(
            new Request(
              `https://fondof-cache.internal/skills:pool:v4:${sort}:::::${lim}`,
            ),
          )
          .catch(() => undefined);
      }
      await caches.default
        .delete(new Request(`https://fondof-cache.internal/skills:pool:v1:${lim}`))
        .catch(() => undefined);
    }

    return c.json({ success: true, visibility: "unlisted" });
  },
);

/**
 * Public creator summary. This is keyed only by an explicit owner login and
 * reports attached evidence, not reputation or causal project impact.
 */
skillsRoute.get("/skills/creator/:login", async (c) => {
  const login = c.req.param("login")?.trim().toLowerCase();
  if (!login) return c.json({ error: "login required" }, 400);

  const records = (await listPublicSkills(c.env, 100)).filter(
    (record) => record.ownerLogin?.toLowerCase() === login,
  );
  const evidences = await Promise.all(
    records.map((record) => getSkillEvidence(c.env, record.hash)),
  );
  const impact = {
    skillCount: records.length,
    skillsWithEvidence: 0,
    remixCount: records.filter((record) => Boolean(record.derivedFromSkillHash)).length,
    fittedRepoCount: new Set(records.map((record) => record.repo).filter(Boolean)).size,
    claimedUseCount: 0,
    outcomeCount: 0,
    linkedPrCount: 0,
    githubConfirmedPrCount: 0,
    mergedPrCount: 0,
    evidenceScore: 0,
  };
  for (const evidence of evidences) {
    const summary = summarizeEvidence(evidence);
    impact.claimedUseCount += summary.claimedUseCount;
    impact.outcomeCount += summary.outcomeCount;
    impact.linkedPrCount += summary.linkedPrCount;
    impact.githubConfirmedPrCount += summary.githubConfirmedPrCount;
    impact.mergedPrCount += summary.mergedPrCount;
    impact.evidenceScore += summary.evidenceScore;
    if (summary.evidenceScore > 0) impact.skillsWithEvidence += 1;
  }

  return c.json({ login, impact });
});

/**
 * Return the public parent/child lineage for a skill. Content stays on the
 * individual skill pages; this endpoint exposes only graph metadata.
 */
skillsRoute.get("/skills/:hash/lineage", async (c) => {
  const hash = c.req.param("hash").toLowerCase().replace(/^0x/, "");
  const record = await getPublicSkill(c.env, hash);
  if (!record) return c.json({ error: "Skill not found" }, 404);

  const records = await listPublicSkills(c.env, 100);
  const node = (item: typeof record) => ({
    hash: item.hash,
    title: item.title,
    repo: item.repo,
    composedAt: item.composedAt,
    derivedFromSkillHash: item.derivedFromSkillHash,
    sourceUrls: item.sourceUrls,
    canonicalSources: item.canonicalSources,
    genres: classifySkillGenres({
      domains: item.domains,
      patternTypes: item.patternTypes,
      frameworks: item.frameworks,
      languages: item.languages,
      title: item.title,
      blurb: item.blurb,
    }),
  });
  const children = records
    .filter(
      (record) =>
        record.derivedFromSkillHash?.toLowerCase().replace(/^0x/, "") === hash,
    )
    .map(node)
    .sort((a, b) => b.composedAt.localeCompare(a.composedAt));

  const currentNode = node(record);
  const immediateParent = record.derivedFromSkillHash
    ? records.find(
        (item) => item.hash === record.derivedFromSkillHash?.toLowerCase().replace(/^0x/, ""),
      )
    : undefined;
  const ancestors: ReturnType<typeof node>[] = [];
  const seen = new Set<string>([hash]);
  let cursor = record.derivedFromSkillHash
    ?.toLowerCase()
    .replace(/^0x/, "");
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const ancestor = records.find((record) => record.hash === cursor);
    if (!ancestor) break;
    ancestors.unshift(node(ancestor));
    cursor = ancestor.derivedFromSkillHash
      ?.toLowerCase()
      .replace(/^0x/, "");
  }

  return c.json({
    skillHash: hash,
    parent: immediateParent ? node(immediateParent) : null,
    ancestors,
    skill: currentNode,
    children,
    note: "Lineage records show derivation metadata; they do not prove that a parent caused a child outcome.",
  });
});

// Get skill data + signal from chain (short edge cache — protects RPC)
skillsRoute.get("/skills/:hash", async (c) => {
  const hash = c.req.param("hash");
  const cacheKey = `skill:v4:${hash.toLowerCase()}`;

  const hit = await cacheGetJson<Record<string, unknown>>(cacheKey);
  if (hit) {
    c.header("X-Cache", "HIT");
    return c.json(hit);
  }

  // A tombstoned artifact stays hidden even if an attestation exists on-chain.
  const stored = await getSkillRecord(c.env, hash);
  if (stored?.visibility === "unlisted") {
    return c.json({ error: "Skill is unlisted" }, 404);
  }

  // Durable public registry first — /s/[hash] must resolve without a chain
  // round-trip. Attested skills still pull live signal from the chain.
  const pub = await getPublicSkill(c.env, hash);
  if (pub) {
    const offChainBase = {
      skillHash: pub.hash,
      forger: "",
      backing: "0",
      usageCount: 0,
      challengeLosses: 0,
      createdAt: Date.parse(pub.composedAt) || 0,
      signal: "0",
      sourceHashes: pub.sourceHashes,
      canonicalSources: pub.canonicalSources,
      domains: pub.domains,
      patternTypes: pub.patternTypes,
      derivedFromSkillHash: pub.derivedFromSkillHash,
      ownerLogin: pub.ownerLogin,
      visibility: pub.visibility,
    };

    const evidence = await getSkillEvidence(c.env, hash);
    const chain = pub.onChain
      ? await getSkillFromChain(
          c.env.MONAD_RPC_URL,
          c.env.FONDOF_CONTRACT_ADDRESS,
          hash,
        )
      : null;

    const withMeta = await mergeSkillMeta(chain ?? offChainBase, {
      includeBody: true,
    });
    const out = {
      ...withMeta,
      title: withMeta.title ?? pub.title,
      blurb: withMeta.blurb ?? pub.blurb,
      repo: withMeta.repo ?? pub.repo,
      frameworks: withMeta.frameworks ?? pub.frameworks,
      markdown: withMeta.markdown ?? pub.markdown,
      sourceUrls: pub.sourceUrls,
      canonicalSources: pub.canonicalSources,
      languages: pub.languages,
      domains: pub.domains,
      patternTypes: pub.patternTypes,
      derivedFromSkillHash: pub.derivedFromSkillHash,
      onChain: Boolean(pub.onChain) || Boolean(chain),
      attestedTxHash: pub.attestedTxHash,
      attestedAt: pub.attestedAt,
      ownerLogin: pub.ownerLogin,
      visibility: pub.visibility,
      evidence,
      evidenceSummary: summarizeEvidence(evidence),
      outcome: evidence?.outcome ?? withMeta.outcome,
      genres: classifySkillGenres({
        domains: pub.domains,
        patternTypes: pub.patternTypes,
        frameworks: pub.frameworks,
        languages: pub.languages,
        title: pub.title,
        blurb: pub.blurb,
      }),
    };
    await cachePutJson(cacheKey, out, SKILL_TTL);
    c.header("X-Cache", "MISS");
    return c.json(out);
  }

  try {
    const skill = await getSkillFromChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_CONTRACT_ADDRESS,
      hash,
    );

    if (!skill) return c.json({ error: "Skill not found in pool" }, 404);
    const withMeta = await mergeSkillMeta(skill, { includeBody: true });
    const evidence = await getSkillEvidence(c.env, hash);
    const out = {
      ...withMeta,
      onChain: true,
      evidence,
      evidenceSummary: summarizeEvidence(evidence),
      outcome: evidence?.outcome ?? withMeta.outcome,
      genres: [],
    };
    await cachePutJson(cacheKey, out, SKILL_TTL);
    c.header("X-Cache", "MISS");
    return c.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// Get top skills by signal
skillsRoute.get("/skills", async (c) => {
  const limit = clampLimit(parseInt(c.req.query("limit") ?? "10"));
  const requestedSort = c.req.query("sort");
  const sort = (["recent", "impact", "outcomes", "adapted"] as const).includes(
    requestedSort as "recent" | "impact" | "outcomes" | "adapted",
  )
    ? (requestedSort as "recent" | "impact" | "outcomes" | "adapted")
    : "recent";
  const domain = c.req.query("domain")?.trim().toLowerCase() || "";
  const framework = c.req.query("framework")?.trim().toLowerCase() || "";
  const language = c.req.query("language")?.trim().toLowerCase() || "";
  const genreSlug = c.req.query("genre")?.trim().toLowerCase() || "";
  if (genreSlug && !genreBySlug(genreSlug)) {
    return c.json({ error: `Unknown genre: ${genreSlug}` }, 400);
  }
  const hasFilter = Boolean(domain || framework || language || genreSlug);
  const cacheKey = `skills:pool:v4:${sort}:${domain}:${framework}:${language}:${genreSlug}:${limit}`;

  const hit = await cacheGetJson<{ skills: unknown[] }>(cacheKey);
  if (hit) {
    c.header("X-Cache", "HIT");
    return c.json(hit);
  }

  // Durable public pool first — a pool of skills, not txs. Discovery modes
  // read a larger window so filters and lineage counts are meaningful.
  const pub = await listPublicSkills(c.env, sort === "recent" && !hasFilter ? limit : 100);
  const childCounts = new Map<string, number>();
  for (const record of pub) {
    if (record.derivedFromSkillHash) {
      const parent = record.derivedFromSkillHash.toLowerCase();
      childCounts.set(parent, (childCounts.get(parent) ?? 0) + 1);
    }
  }
  const filteredPub = pub.filter((record) => {
    const matches = (values: string[] | undefined, query: string) =>
      !query || (values ?? []).some((value) => value.toLowerCase() === query);
    return (
      matches(record.domains, domain) &&
      matches(record.frameworks, framework) &&
      matches(record.languages, language) &&
      (!genreSlug ||
        classifySkillGenres({
          domains: record.domains,
          patternTypes: record.patternTypes,
          frameworks: record.frameworks,
          languages: record.languages,
          title: record.title,
          blurb: record.blurb,
        }).some((genre) => genre.slug === genreSlug))
    );
  });
  if (pub.length > 0 || sort !== "recent" || hasFilter) {
    const skills = await Promise.all(
      filteredPub.map(async (rec) => {
        const offChainBase = {
          skillHash: rec.hash,
          forger: "",
          backing: "0",
          usageCount: 0,
          challengeLosses: 0,
          createdAt: Date.parse(rec.composedAt) || 0,
          signal: "0",
          sourceHashes: rec.sourceHashes,
          canonicalSources: rec.canonicalSources,
          domains: rec.domains,
          patternTypes: rec.patternTypes,
          derivedFromSkillHash: rec.derivedFromSkillHash,
          ownerLogin: rec.ownerLogin,
          visibility: rec.visibility,
        };
        const evidence = await getSkillEvidence(c.env, rec.hash);
        const chain = rec.onChain
          ? await getSkillFromChain(
              c.env.MONAD_RPC_URL,
              c.env.FONDOF_CONTRACT_ADDRESS,
              rec.hash,
            )
          : null;
        const withMeta = await mergeSkillMeta(chain ?? offChainBase);
        return {
          ...withMeta,
          title: withMeta.title ?? rec.title,
          repo: withMeta.repo ?? rec.repo,
          sourceUrls: rec.sourceUrls,
          canonicalSources: rec.canonicalSources,
          onChain: Boolean(rec.onChain) || Boolean(chain),
          ownerLogin: rec.ownerLogin,
          visibility: rec.visibility,
          evidence,
          evidenceSummary: summarizeEvidence(evidence),
          outcome: evidence?.outcome ?? withMeta.outcome,
          composedAt: rec.composedAt,
          lineageChildrenCount: childCounts.get(rec.hash) ?? 0,
          genres: classifySkillGenres({
            domains: rec.domains,
            patternTypes: rec.patternTypes,
            frameworks: rec.frameworks,
            languages: rec.languages,
            title: rec.title,
            blurb: rec.blurb,
          }),
        };
      }),
    );
    const ordered = [...skills].sort((a, b) => {
      const aSummary = a.evidenceSummary;
      const bSummary = b.evidenceSummary;
      if (sort === "adapted") {
        return (
          (b.lineageChildrenCount ?? 0) - (a.lineageChildrenCount ?? 0) ||
          bSummary.evidenceScore - aSummary.evidenceScore ||
          String(b.composedAt ?? "").localeCompare(String(a.composedAt ?? ""))
        );
      }
      if (sort === "outcomes") {
        return (
          bSummary.outcomeCount - aSummary.outcomeCount ||
          bSummary.githubConfirmedPrCount - aSummary.githubConfirmedPrCount ||
          bSummary.claimedUseCount - aSummary.claimedUseCount ||
          String(b.composedAt ?? "").localeCompare(String(a.composedAt ?? ""))
        );
      }
      if (sort === "impact") {
        return (
          bSummary.evidenceScore - aSummary.evidenceScore ||
          bSummary.githubConfirmedPrCount - aSummary.githubConfirmedPrCount ||
          bSummary.claimedUseCount - aSummary.claimedUseCount ||
          String(b.composedAt ?? "").localeCompare(String(a.composedAt ?? ""))
        );
      }
      return String(b.composedAt ?? "").localeCompare(String(a.composedAt ?? ""));
    });
    const facetValues = (field: "domains" | "frameworks" | "languages") =>
      [...new Set(pub.flatMap((record) => record[field] ?? []))]
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 40);
    const genreCounts = new Map<string, number>();
    for (const record of pub) {
      for (const genre of classifySkillGenres({
        domains: record.domains,
        patternTypes: record.patternTypes,
        frameworks: record.frameworks,
        languages: record.languages,
        title: record.title,
        blurb: record.blurb,
      })) {
        genreCounts.set(genre.slug, (genreCounts.get(genre.slug) ?? 0) + 1);
      }
    }
    const payload = {
      skills: ordered.slice(0, limit),
      sort,
      filters: { domain, framework, language, genre: genreSlug },
      facets: {
        domains: facetValues("domains"),
        frameworks: facetValues("frameworks"),
        languages: facetValues("languages"),
        genres: SKILL_GENRES.map((genre) => ({
          ...genre,
          count: genreCounts.get(genre.slug) ?? 0,
        })).filter((genre) => genre.count > 0),
      },
    };
    await cachePutJson(cacheKey, payload, TOP_TTL);
    c.header("X-Cache", "MISS");
    return c.json(payload);
  }

  // Legacy: on-chain top skills only (empty registry fallback)
  try {
    const hashes = await getTopSkillsFromChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_CONTRACT_ADDRESS,
      limit,
    );

    const skills = await Promise.all(
      hashes.map((h) =>
        getSkillFromChain(
          c.env.MONAD_RPC_URL,
          c.env.FONDOF_CONTRACT_ADDRESS,
          h,
        ),
      ),
    );

    const withMeta = await Promise.all(
      skills.filter(Boolean).map((s) => mergeSkillMeta(s!)),
    );
    const payload = {
      skills: withMeta.map((s) => ({
        ...s,
        onChain: true,
        evidenceSummary: summarizeEvidence(null),
        lineageChildrenCount: 0,
        genres: [],
      })),
      sort,
      filters: { domain, framework, language, genre: genreSlug },
      facets: { domains: [], frameworks: [], languages: [], genres: [] },
    };
    await cachePutJson(cacheKey, payload, TOP_TTL);
    c.header("X-Cache", "MISS");
    return c.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// Record a claimed use. Public off-chain skills stay chain-independent; an
// attested skill additionally attempts the optional on-chain receipt.
skillsRoute.post("/skills/:hash/use", rateLimit("use"), async (c) => {
  const hash = c.req.param("hash");
  const body = await c.req
    .json<{ receiptKey?: string; consented?: boolean; intent?: string }>()
    .catch(
      () => ({}) as { receiptKey?: string; consented?: boolean },
    );
  const session = await resolveSession(
    c.req.header("Authorization"),
    c.env.SESSIONS,
  );
  const browserReceiptKey =
    body.consented && body.receiptKey && /^[a-zA-Z0-9_-]{16,128}$/.test(body.receiptKey)
      ? `browser:${body.receiptKey}`
      : undefined;
  const actorKey = session ? `user:${session.userId}` : browserReceiptKey;

  try {
    const claim = await recordClaimedUse(c.env, hash, actorKey);
    const evidence = claim.evidence;
    const publicSkill = await getPublicSkill(c.env, hash);

    if (publicSkill && !publicSkill.onChain) {
      await caches.default
        .delete(
          new Request(
            `https://fondof-cache.internal/skill:v4:${hash.toLowerCase()}`,
          ),
        )
        .catch(() => undefined);
      return c.json({
        success: true,
        claimed: true,
        evidence,
        deduplicated: claim.deduplicated,
        tracking: claim.tracking,
        note: claim.deduplicated
          ? "This account/browser already claimed this use; no duplicate impact count was added."
          : "Claimed use recorded off-chain; this is not verified project impact.",
      });
    }

    if (!session) {
      await caches.default
        .delete(
          new Request(
            `https://fondof-cache.internal/skill:v4:${hash.toLowerCase()}`,
          ),
        )
        .catch(() => undefined);
      return c.json({
        success: true,
        claimed: true,
        evidence,
        deduplicated: claim.deduplicated,
        tracking: claim.tracking,
        note:
          "Claimed use recorded off-chain. Sign in to attach an on-chain receipt (relayer-sponsored).",
      });
    }

    const key = relayerSigningKey(
      "use",
      c.env.FONDOF_RELAYER_KEY,
      c.env.FONDOF_RESOLVER_KEY,
    );
    if (!key.ok) {
      return c.json({
        success: true,
        claimed: true,
        evidence,
        deduplicated: claim.deduplicated,
        tracking: claim.tracking,
        note: "Claimed use recorded; on-chain receipt is unavailable.",
      });
    }

    const bodyIntent = (body as { intent?: string }).intent;
    const metered = await runRelayerWrite(
      c.env.SESSIONS,
      c.env.RELAYER_HALT,
      session,
      "use",
      { skillHash: hash },
      async () => {
        const receipt = await useOnChain(
          c.env.MONAD_RPC_URL,
          key.key,
          c.env.FONDOF_CONTRACT_ADDRESS,
          hash,
        );
        return {
          txHash: receipt.txHash,
          blockNumber: receipt.blockNumber,
        };
      },
      bodyIntent,
    );
    if (!metered.ok) {
      return c.json({
        success: true,
        claimed: true,
        evidence,
        deduplicated: claim.deduplicated,
        tracking: claim.tracking,
        note: "Claimed use recorded off-chain; on-chain receipt was not sponsored.",
        relayer: metered.body,
      });
    }

    await caches.default
      .delete(
        new Request(
          `https://fondof-cache.internal/skill:v4:${hash.toLowerCase()}`,
        ),
      )
      .catch(() => undefined);

    return c.json({
      success: true,
      claimed: true,
      txHash: metered.value.txHash,
      blockNumber: metered.value.blockNumber,
      evidence,
      deduplicated: claim.deduplicated,
      tracking: claim.tracking,
      replay: metered.replay,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

/** Confirm a linked public GitHub PR exists without claiming causality. */
skillsRoute.post(
  "/skills/:hash/verify-pr",
  rateLimit("publish"),
  async (c) => {
    const session = await resolveSession(
      c.req.header("Authorization"),
      c.env.SESSIONS,
    );
    const result = await verifyLinkedPr(
      c.env,
      c.req.param("hash"),
      session?.accessToken,
    );
    if (!result.ok) {
      return c.json(
        { error: result.reason, evidence: result.evidence },
        result.reason.includes("not found") ? 404 : 422,
      );
    }

    await caches.default
      .delete(
        new Request(
          `https://fondof-cache.internal/skill:v4:${c.req
            .param("hash")
            .toLowerCase()}`,
        ),
      )
      .catch(() => undefined);
    return c.json({
      success: true,
      evidence: result.evidence,
      note: "GitHub confirmed the PR exists; this does not verify that the skill caused the change.",
    });
  },
);

/**
 * Agent receipt storm — N use() txs back-to-back.
 * Demo: quality signals at Monad speed (not viable as per-use receipts on L1).
 */
skillsRoute.post("/skills/:hash/storm", rateLimit("storm"), async (c) => {
  const session = await resolveSession(
    c.req.header("Authorization"),
    c.env.SESSIONS,
  );
  if (!session) {
    return c.json({ error: "Sign in to run a relayer receipt storm" }, 401);
  }

  const hash = c.req.param("hash");
  const body = (await c.req
    .json<{ count?: number; intent?: string }>()
    .catch(() => ({ count: 8 }))) as { count?: number; intent?: string };
  const count = body.count ?? 8;

  const key = relayerSigningKey(
    "storm",
    c.env.FONDOF_RELAYER_KEY,
    c.env.FONDOF_RESOLVER_KEY,
  );
  if (!key.ok) return c.json(key.body, key.status as 503);

  try {
    const metered = await runRelayerWrite(
      c.env.SESSIONS,
      c.env.RELAYER_HALT,
      session,
      "storm",
      { skillHash: hash, count },
      async () => {
        const storm = await useStormOnChain(
          c.env.MONAD_RPC_URL,
          key.key,
          c.env.FONDOF_CONTRACT_ADDRESS,
          hash,
          count,
        );
        return {
          count: storm.count,
          submittedMs: storm.submittedMs,
          confirmedMs: storm.confirmedMs,
          txHashes: storm.txHashes,
          blockNumber: storm.blockNumber,
        };
      },
      body.intent,
    );
    if (!metered.ok) {
      return c.json(metered.body, metered.status as 400);
    }

    try {
      await caches.default.delete(
        new Request(
          `https://fondof-cache.internal/skill:v4:${hash.toLowerCase()}`,
        ),
      );
    } catch {
      // ignore
    }

    const skill = await getSkillFromChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_CONTRACT_ADDRESS,
      hash,
    );
    const hashes = metered.value.txHashes as string[];

    return c.json({
      success: true,
      count: metered.value.count,
      submittedMs: metered.value.submittedMs,
      confirmedMs: metered.value.confirmedMs,
      txHashes: hashes,
      blockNumber: metered.value.blockNumber,
      signal: skill?.signal,
      usageCount: skill?.usageCount,
      replay: metered.replay,
      explorer: `https://testnet.monadexplorer.com/tx/${hashes[hashes.length - 1]}`,
      note: `${metered.value.count} agent receipts on Monad in ${metered.value.confirmedMs}ms — per-use quality tracking`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
