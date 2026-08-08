import { Hono } from "hono";
import type { Env } from "../index.js";
import {
  getSkillFromChain,
  getTopSkillsFromChain,
  useOnChain,
} from "../lib/monad.js";
import { cacheGetJson, cachePutJson } from "../lib/edge-cache.js";
import { rateLimit } from "../lib/rate-limit-mw.js";

export const skillsRoute = new Hono<{ Bindings: Env }>();

const SKILL_TTL = 60; // KV/Cache min practical TTL
const TOP_TTL = 60;

// Get skill data + signal from chain (short edge cache — protects RPC)
skillsRoute.get("/skills/:hash", async (c) => {
  const hash = c.req.param("hash");
  const cacheKey = `skill:v1:${hash.toLowerCase()}`;

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
    await cachePutJson(cacheKey, skill, SKILL_TTL);
    c.header("X-Cache", "MISS");
    return c.json(skill);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// Get top skills by signal
skillsRoute.get("/skills", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "10");
  const cacheKey = `skills:top:v1:${limit}`;

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

    const payload = { skills: skills.filter(Boolean) };
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
          `https://fondof-cache.internal/skill:v1:${hash.toLowerCase()}`,
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
