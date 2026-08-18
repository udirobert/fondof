import { Hono } from "hono";
import type { Env } from "../index.js";
import { forgeOnChain } from "../lib/monad.js";
import { putSkillMeta, type LandingHitRecord } from "../lib/skill-meta.js";
import {
  getSkillRecord,
  markSkillAttested,
  recordPublicSkill,
} from "../lib/skill-registry.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import { resolveSession } from "./auth.js";

export const publishRoute = new Hono<{ Bindings: Env }>();

publishRoute.post("/publish", rateLimit("publish"), async (c) => {
  const body = await c.req.json<{
    skillHash: string;
    sourceHashes: string[];
    title?: string;
    blurb?: string;
    repo?: string;
    markdown?: string;
    landings?: LandingHitRecord[];
    frameworks?: string[];
  }>();

  const { skillHash, sourceHashes, title, blurb, repo, markdown, landings, frameworks } =
    body;

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

    // Older wallet/relayer callers may have attested before creating a public
    // registry record. Preserve that artifact durably when enough metadata is
    // present; newer private-first flows already have the record.
    const existing = await getSkillRecord(c.env, skillHash);
    if (!existing && title?.trim() && markdown?.trim()) {
      const session = await resolveSession(
        c.req.header("Authorization"),
        c.env.SESSIONS,
      );
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
        ownerId: session?.userId,
        ownerLogin: session?.login,
      });
    }

    // Second click complete — stamp the durable public record as on-chain.
    await markSkillAttested(c.env, skillHash, receipt.txHash).catch(
      () => undefined,
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
