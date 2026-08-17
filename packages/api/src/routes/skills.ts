import { Hono } from "hono";
import type { Env } from "../index.js";
import {
  acquireFromChain,
  getSkillFromChain,
  getTopSkillsFromChain,
  useOnChain,
  useStormOnChain,
} from "../lib/monad.js";
import { cacheGetJson, cachePutJson } from "../lib/edge-cache.js";
import { mergeSkillMeta, putSkillMeta, type LandingHitRecord } from "../lib/skill-meta.js";
import { getPublicSkill, listPublicSkills } from "../lib/skill-registry.js";
import { rateLimit } from "../lib/rate-limit-mw.js";

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

  return c.json({ success: true, meta: record });
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
    };

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
      languages: pub.languages,
      onChain: Boolean(pub.onChain) || Boolean(chain),
      attestedTxHash: pub.attestedTxHash,
      attestedAt: pub.attestedAt,
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
    const out = { ...withMeta, onChain: true };
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
        };
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
          onChain: Boolean(rec.onChain) || Boolean(chain),
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

// Record usage (increases signal)
skillsRoute.post("/skills/:hash/use", rateLimit("use"), async (c) => {
  const hash = c.req.param("hash");

  if (!c.env.FONDOF_RELAYER_KEY) {
    return c.json({ error: "Relayer not configured" }, 500);
  }

  try {
    const receipt = await useOnChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_RELAYER_KEY,
      c.env.FONDOF_CONTRACT_ADDRESS,
      hash,
    );

    // Invalidate skill cache so signal refreshes
    try {
      await caches.default.delete(
        new Request(
          `https://fondof-cache.internal/skill:v4:${hash.toLowerCase()}`,
        ),
      );
    } catch {
      // ignore
    }

    return c.json({
      success: true,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

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
