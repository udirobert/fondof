import { Hono } from "hono";
import type { Env } from "../index.js";
import {
  challengeOnChain,
  getOpenChallengesFromChain,
  resolveOnChain,
} from "../lib/monad.js";
import { rateLimit } from "../lib/rate-limit-mw.js";

export const challengeRoute = new Hono<{ Bindings: Env }>();

challengeRoute.post("/challenge", rateLimit("challenge"), async (c) => {
  const { skillHash } = await c.req.json<{ skillHash: string }>();

  if (!skillHash) return c.json({ error: "skillHash is required" }, 400);

  if (!c.env.FONDOF_RELAYER_KEY) {
    return c.json({ error: "Relayer not configured" }, 500);
  }

  try {
    const receipt = await challengeOnChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_RELAYER_KEY,
      c.env.FONDOF_CONTRACT_ADDRESS,
      skillHash,
    );

    return c.json({
      success: true,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
      challengeId: receipt.challengeId,
      explorer: `https://testnet.monadexplorer.com/tx/${receipt.txHash}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

/** List open (unresolved) challenges — optional skillHash filter. */
challengeRoute.get("/challenges", async (c) => {
  const skillHash = c.req.query("skillHash") || undefined;
  const limit = parseInt(c.req.query("limit") ?? "12", 10);

  try {
    const challenges = await getOpenChallengesFromChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_CONTRACT_ADDRESS,
      { skillHash, limit },
    );
    return c.json({ challenges });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

/**
 * Resolve a challenge (resolver/relayer). Demo: challengerWon true = skill loses signal.
 */
challengeRoute.post(
  "/challenge/:id/resolve",
  rateLimit("resolve"),
  async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (!Number.isFinite(id) || id < 0) {
      return c.json({ error: "invalid challenge id" }, 400);
    }

    const body = (await c.req
      .json<{ challengerWon?: boolean }>()
      .catch(() => ({ challengerWon: true }))) as { challengerWon?: boolean };
    const challengerWon = body.challengerWon !== false;

    if (!c.env.FONDOF_RELAYER_KEY) {
      return c.json({ error: "Relayer not configured" }, 500);
    }

    try {
      const open = await getOpenChallengesFromChain(
        c.env.MONAD_RPC_URL,
        c.env.FONDOF_CONTRACT_ADDRESS,
        { limit: 50 },
      );
      const target = open.find((ch) => ch.challengeId === id);

      const receipt = await resolveOnChain(
        c.env.MONAD_RPC_URL,
        c.env.FONDOF_RELAYER_KEY,
        c.env.FONDOF_CONTRACT_ADDRESS,
        id,
        challengerWon,
      );

      if (target?.skillHash) {
        try {
          await caches.default.delete(
            new Request(
              `https://fondof-cache.internal/skill:v1:${target.skillHash.toLowerCase()}`,
            ),
          );
        } catch {
          // ignore
        }
      }

      return c.json({
        success: true,
        challengeId: id,
        challengerWon,
        skillHash: target?.skillHash,
        txHash: receipt.txHash,
        blockNumber: receipt.blockNumber,
        explorer: `https://testnet.monadexplorer.com/tx/${receipt.txHash}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return c.json({ error: msg }, 500);
    }
  },
);
