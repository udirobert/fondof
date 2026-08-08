import { Hono } from "hono";
import type { Env } from "../index.js";
import { challengeOnChain } from "../lib/monad.js";

export const challengeRoute = new Hono<{ Bindings: Env }>();

challengeRoute.post("/challenge", async (c) => {
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
      skillHash
    );

    return c.json({
      success: true,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
      explorer: `https://testnet.monadexplorer.com/tx/${receipt.txHash}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
