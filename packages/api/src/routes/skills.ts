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
import { mergeSkillMeta, putSkillMeta } from "../lib/skill-meta.js";
import { rateLimit } from "../lib/rate-limit-mw.js";

export const skillsRoute = new Hono<{ Bindings: Env }>();

const SKILL_TTL = 60; // KV/Cache min practical TTL
const TOP_TTL = 60;

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
    const skill = await mergeSkillMeta(result.skill);
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

/** Store human title after wallet forge (relayer publish includes meta in body). */
skillsRoute.post("/skills/:hash/meta", rateLimit("publish"), async (c) => {
  const hash = c.req.param("hash");
  const body = (await c.req
    .json<{ title?: string; blurb?: string; repo?: string }>()
    .catch(() => ({ title: undefined }))) as {
    title?: string;
    blurb?: string;
    repo?: string;
  };
  const title = body.title?.trim();
  if (!title) {
    return c.json({ error: "title is required" }, 400);
  }
  const record = await putSkillMeta(hash, {
    title,
    blurb: body.blurb,
    repo: body.repo,
  });
  // Bust short skill cache so title appears immediately
  await caches.default
    .delete(
      new Request(
        `https://fondof-cache.internal/skill:v3:${hash.toLowerCase()}`,
      ),
    )
    .catch(() => undefined);
  return c.json({ success: true, meta: record });
});

// Get skill data + signal from chain (short edge cache — protects RPC)
skillsRoute.get("/skills/:hash", async (c) => {
  const hash = c.req.param("hash");
  const cacheKey = `skill:v3:${hash.toLowerCase()}`;

  const hit = await cacheGetJson<Record<string, unknown>>(cacheKey);
  if (hit) {
    c.header("X-Cache", "HIT");
    return c.json(hit);
  }

  try {
    const skill = await getSkillFromChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_CONTRACT_ADDRESS,
      hash,
    );

    if (!skill) return c.json({ error: "Skill not found in pool" }, 404);
    const withMeta = await mergeSkillMeta(skill);
    await cachePutJson(cacheKey, withMeta, SKILL_TTL);
    c.header("X-Cache", "MISS");
    return c.json(withMeta);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// Get top skills by signal
skillsRoute.get("/skills", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "10");
  const cacheKey = `skills:top:v2:${limit}`;

  const hit = await cacheGetJson<{ skills: unknown[] }>(cacheKey);
  if (hit) {
    c.header("X-Cache", "HIT");
    return c.json(hit);
  }

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
    const payload = { skills: withMeta };
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
          `https://fondof-cache.internal/skill:v3:${hash.toLowerCase()}`,
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
          `https://fondof-cache.internal/skill:v3:${hash.toLowerCase()}`,
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
