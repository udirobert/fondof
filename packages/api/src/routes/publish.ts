import { Hono } from "hono";
import type { Env } from "../index.js";
import { forgeOnChain } from "../lib/monad.js";
import { putSkillMeta, type LandingHitRecord } from "../lib/skill-meta.js";
import {
  getSkillRecord,
  markSkillAttested,
  recordPublicSkill,
} from "../lib/skill-registry.js";
import { sha256Hex } from "../lib/edge-cache.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import {
  relayerSigningKey,
  runRelayerWrite,
} from "../lib/relayer-guard.js";
import { resolveSession } from "./auth.js";

export const publishRoute = new Hono<{ Bindings: Env }>();

publishRoute.post("/publish", rateLimit("publish"), async (c) => {
  const session = await resolveSession(
    c.req.header("Authorization"),
    c.env.SESSIONS,
  );
  if (!session) {
    return c.json({ error: "Sign in to attest with the relayer" }, 401);
  }

  const body = await c.req.json<{
    skillHash: string;
    sourceHashes: string[];
    title?: string;
    blurb?: string;
    repo?: string;
    markdown?: string;
    landings?: LandingHitRecord[];
    frameworks?: string[];
    intent?: string;
  }>();

  const { skillHash, sourceHashes, title, blurb, repo, markdown, landings, frameworks } =
    body;

  if (!skillHash) return c.json({ error: "skillHash is required" }, 400);
  if (!sourceHashes?.length) return c.json({ error: "sourceHashes are required" }, 400);

  const existing = await getSkillRecord(c.env, skillHash);
  if (existing) {
    if (existing.ownerId !== session.userId) {
      return c.json({ error: "Only the skill owner can attest it" }, 403);
    }
  } else if (markdown?.trim()) {
    const contentHash = await sha256Hex(markdown);
    if (contentHash !== skillHash.toLowerCase().replace(/^0x/, "")) {
      return c.json({ error: "markdown does not match skillHash" }, 409);
    }
  } else {
    return c.json(
      { error: "Share the skill first, or provide markdown that matches skillHash" },
      403,
    );
  }

  const key = relayerSigningKey(
    "publish",
    c.env.FONDOF_RELAYER_KEY,
    c.env.FONDOF_RESOLVER_KEY,
  );
  if (!key.ok) return c.json(key.body, key.status as 503);

  try {
    const metered = await runRelayerWrite(
      c.env.SESSIONS,
      c.env.RELAYER_HALT,
      session,
      "publish",
      { skillHash, sourceHashes },
      async () => {
        const receipt = await forgeOnChain(
          c.env.MONAD_RPC_URL,
          key.key,
          c.env.FONDOF_CONTRACT_ADDRESS,
          skillHash,
          sourceHashes,
        );
        return {
          txHash: receipt.txHash,
          blockNumber: receipt.blockNumber,
        };
      },
      body.intent,
    );
    if (!metered.ok) {
      return c.json(metered.body, metered.status as 400);
    }

    if (title?.trim()) {
      await putSkillMeta(skillHash, {
        title,
        blurb,
        repo,
        markdown,
        landings,
        frameworks,
      });
    }

    if (!existing && title?.trim() && markdown?.trim()) {
      await recordPublicSkill(c.env, {
        hash: skillHash,
        title,
        blurb,
        repo,
        markdown,
        frameworks,
        sourceUrls: [],
        sourceHashes,
        composedAt: new Date().toISOString(),
        ownerId: session.userId,
        ownerLogin: session.login,
      });
    }

    await markSkillAttested(c.env, skillHash, String(metered.value.txHash)).catch(
      () => undefined,
    );

    return c.json({
      success: true,
      txHash: metered.value.txHash,
      blockNumber: metered.value.blockNumber,
      skillHash,
      replay: metered.replay,
      explorer: `https://testnet.monadexplorer.com/tx/${metered.value.txHash}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});
