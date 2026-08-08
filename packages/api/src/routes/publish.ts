import { Hono } from "hono";
import type { Env } from "../index.js";
import { forgeOnChain } from "../lib/monad.js";
import { rateLimit } from "../lib/rate-limit-mw.js";

export const publishRoute = new Hono<{ Bindings: Env }>();

publishRoute.post("/publish", rateLimit("publish"), async (c) => {
  const { skillHash, sourceHashes } = await c.req.json<{
    skillHash: string;
    sourceHashes: string[];
  }>();

  if (!skillHash) return c.json({ error: "skillHash is required" }, 400);
  if (!sourceHashes?.length) return c.json({ error: "sourceHashes are required" }, 400);

  if (!c.env.FONDOF_RELAYER_KEY) {
    return c.json({ error: "Relayer not configured" }, 500);
  }

  try {
    const receipt = await forgeOnChain(
      c.env.MONAD_RPC_URL,
      c.env.FONDOF_RELAYER_KEY,
      c.env.FONDOF_CONTRACT_ADDRESS,
      skillHash,
      sourceHashes
    );

    return c.json({
      success: true,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
      skillHash,
      explorer: `https://testnet.monadexplorer.com/tx/${receipt.txHash}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
