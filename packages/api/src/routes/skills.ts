import { Hono } from "hono";
import type { Env } from "../index.js";
import { getSkillFromChain, getTopSkillsFromChain, useOnChain } from "../lib/monad.js";

export const skillsRoute = new Hono<{ Bindings: Env }>();

// Get skill data + signal from chain
skillsRoute.get("/skills/:hash", async (c) => {
  const hash = c.req.param("hash");

  try {
    const skill = await getSkillFromChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_CONTRACT_ADDRESS,
      hash
    );

    if (!skill) return c.json({ error: "Skill not found in pool" }, 404);
    return c.json(skill);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// Get top skills by signal
skillsRoute.get("/skills", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "10");

  try {
    const hashes = await getTopSkillsFromChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_CONTRACT_ADDRESS,
      limit
    );

    // Fetch full data for each
    const skills = await Promise.all(
      hashes.map((h) =>
        getSkillFromChain(c.env.MONAD_RPC_URL, c.env.FONDOF_CONTRACT_ADDRESS, h)
      )
    );

    return c.json({ skills: skills.filter(Boolean) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// Record usage (increases signal)
skillsRoute.post("/skills/:hash/use", async (c) => {
  const hash = c.req.param("hash");

  if (!c.env.FONDOF_RELAYER_KEY) {
    return c.json({ error: "Relayer not configured" }, 500);
  }

  try {
    const receipt = await useOnChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_RELAYER_KEY,
      c.env.FONDOF_CONTRACT_ADDRESS,
      hash
    );

    return c.json({ success: true, txHash: receipt.txHash, blockNumber: receipt.blockNumber });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
