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
  recordPublicSkill,
  unlistPublicSkill,
} from "../lib/skill-registry.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import { resolveSession } from "./auth.js";

export const skillsRoute = new Hono<{ Bindings: Env }>();

const SKILL_TTL = 60; // KV/Cache min practical TTL
const TOP_TTL = 60;

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
  };

  const hasOutcomePatch = body.outcome !== undefined;
  const title = body.title?.trim();
  if (!title && !hasOutcomePatch) {
    return c.json({ error: "title is required" }, 400);
  }
  if (body.outcome && body.outcome !== null) {
    const note = body.outcome.note?.trim() ?? "";
    if (note.length < 8) {
      return c.json({ error: "outcome note is too short" }, 400);
    }
  }

  const record = await putSkillMeta(hash, {
    title,
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
  });

  await patchPublicSkill(c.env, hash, {
    title,
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
  // Best-effort list cache bust (pool + legacy top)
  for (const lim of [5, 10, 20]) {
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
 * separate from onchain attestation and works for anonymous users.
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
  if (
    existing?.visibility === "unlisted" &&
    existing.ownerId !== session?.userId
  ) {
    return c.json({ error: "Only the owner can re-share this skill" }, 403);
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
    for (const lim of [5, 10, 20]) {
      await caches.default
        .delete(new Request(`https://fondof-cache.internal/skills:pool:v1:${lim}`))
        .catch(() => undefined);
    }

    return c.json({ success: true, visibility: "unlisted" });
  },
);

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
      outcome: evidence?.outcome ?? withMeta.outcome,
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
      outcome: evidence?.outcome ?? withMeta.outcome,
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
  const cacheKey = `skills:pool:v1:${limit}`;

  const hit = await cacheGetJson<{ skills: unknown[] }>(cacheKey);
  if (hit) {
    c.header("X-Cache", "HIT");
    return c.json(hit);
  }

  // Durable public pool first — a pool of skills, not txs.
  const pub = await listPublicSkills(c.env, limit);
  if (pub.length > 0) {
    const skills = await Promise.all(
      pub.map(async (rec) => {
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
          outcome: evidence?.outcome ?? withMeta.outcome,
        };
      }),
    );
    const payload = { skills };
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
    const payload = { skills: withMeta.map((s) => ({ ...s, onChain: true })) };
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
    .json<{ receiptKey?: string; consented?: boolean }>()
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

    if (!c.env.FONDOF_RELAYER_KEY) {
      return c.json({
        success: true,
        claimed: true,
        evidence,
        deduplicated: claim.deduplicated,
        tracking: claim.tracking,
        note: "Claimed use recorded; on-chain receipt is unavailable.",
      });
    }

    const receipt = await useOnChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_RELAYER_KEY,
      c.env.FONDOF_CONTRACT_ADDRESS,
      hash,
    );

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
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
      evidence,
      deduplicated: claim.deduplicated,
      tracking: claim.tracking,
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
  const hash = c.req.param("hash");
  const body = (await c.req
    .json<{ count?: number }>()
    .catch(() => ({ count: 12 }))) as { count?: number };
  const count = body.count ?? 12;

  if (!c.env.FONDOF_RELAYER_KEY) {
    return c.json({ error: "Relayer not configured" }, 500);
  }

  try {
    const storm = await useStormOnChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_RELAYER_KEY,
      c.env.FONDOF_CONTRACT_ADDRESS,
      hash,
      count,
    );

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

    return c.json({
      success: true,
      count: storm.count,
      submittedMs: storm.submittedMs,
      confirmedMs: storm.confirmedMs,
      txHashes: storm.txHashes,
      blockNumber: storm.blockNumber,
      signal: skill?.signal,
      usageCount: skill?.usageCount,
      explorer: `https://testnet.monadexplorer.com/tx/${storm.txHashes[storm.txHashes.length - 1]}`,
      note: `${storm.count} agent receipts on Monad in ${storm.confirmedMs}ms — per-use quality tracking`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
