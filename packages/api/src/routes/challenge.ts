import { Hono } from "hono";
import type { Env } from "../index.js";
import {
  challengeOnChain,
  getChallengeFromChain,
  getOpenChallengesFromChain,
  resolveOnChain,
} from "../lib/monad.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import {
  isResolverLogin,
  relayerSigningKey,
  runRelayerWrite,
} from "../lib/relayer-guard.js";
import { resolveSession } from "./auth.js";

export const challengeRoute = new Hono<{ Bindings: Env }>();

challengeRoute.post("/challenge", rateLimit("challenge"), async (c) => {
  const session = await resolveSession(c);
  if (!session) {
    return c.json({ error: "Sign in to challenge with the relayer" }, 401);
  }

  const { skillHash, intent } = await c.req.json<{
    skillHash: string;
    intent?: string;
  }>();

  if (!skillHash) return c.json({ error: "skillHash is required" }, 400);

  const key = relayerSigningKey(
    "challenge",
    c.env.FONDOF_RELAYER_KEY,
    c.env.FONDOF_RESOLVER_KEY,
  );
  if (!key.ok) return c.json(key.body, key.status as 503);

  try {
    const metered = await runRelayerWrite(
      c.env.SESSIONS,
      c.env.RELAYER_HALT,
      session,
      "challenge",
      { skillHash },
      async () => {
        const receipt = await challengeOnChain(
          c.env.MONAD_RPC_URL,
          key.key,
          c.env.FONDOF_CONTRACT_ADDRESS,
          skillHash,
        );
        return {
          txHash: receipt.txHash,
          blockNumber: receipt.blockNumber,
          challengeId: receipt.challengeId,
        };
      },
      intent,
    );
    if (!metered.ok) {
      return c.json(metered.body, metered.status as 400);
    }

    return c.json({
      success: true,
      txHash: metered.value.txHash,
      blockNumber: metered.value.blockNumber,
      challengeId: metered.value.challengeId,
      replay: metered.replay,
      explorer: `https://testnet.monadexplorer.com/tx/${metered.value.txHash}`,
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
 * Resolve a challenge. Demo oracle: only allowlisted resolver logins, signed
 * with the dedicated resolver key — never the hot user-operation relayer.
 * The outcome must be an explicit boolean bound to an open on-chain challenge.
 */
challengeRoute.post(
  "/challenge/:id/resolve",
  rateLimit("resolve"),
  async (c) => {
    const session = await resolveSession(c);
    if (!session) {
      return c.json({ error: "Sign in to resolve challenges" }, 401);
    }
    if (!isResolverLogin(session.login, c.env.RESOLVER_LOGINS)) {
      return c.json({ error: "Not an authorized resolver" }, 403);
    }

    const id = parseInt(c.req.param("id"), 10);
    if (!Number.isFinite(id) || id < 0) {
      return c.json({ error: "invalid challenge id" }, 400);
    }

    const body = (await c.req
      .json<{ challengerWon?: unknown; intent?: string }>()
      .catch(() => null)) as {
      challengerWon?: unknown;
      intent?: string;
    } | null;
    if (typeof body?.challengerWon !== "boolean") {
      return c.json({ error: "challengerWon must be a boolean" }, 400);
    }
    const challengerWon = body.challengerWon;

    const key = relayerSigningKey(
      "resolve",
      c.env.FONDOF_RELAYER_KEY,
      c.env.FONDOF_RESOLVER_KEY,
    );
    if (!key.ok) return c.json(key.body, key.status as 503);

    try {
      const target = await getChallengeFromChain(
        c.env.MONAD_RPC_URL,
        c.env.FONDOF_CONTRACT_ADDRESS,
        id,
      );
      if (!target) {
        return c.json({ error: "Challenge not found" }, 404);
      }
      if (target.resolved) {
        return c.json({ error: "Challenge already resolved" }, 409);
      }

      const metered = await runRelayerWrite(
        c.env.SESSIONS,
        c.env.RELAYER_HALT,
        session,
        "resolve",
        { challengeId: id, challengerWon },
        async () => {
          const receipt = await resolveOnChain(
            c.env.MONAD_RPC_URL,
            key.key,
            c.env.FONDOF_CONTRACT_ADDRESS,
            id,
            challengerWon,
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

      if (!metered.replay) {
        await c.env.SESSIONS.put(
          `resolve-audit:${id}`,
          JSON.stringify({
            challengeId: id,
            skillHash: target.skillHash,
            challengerWon,
            resolverId: session.userId,
            resolverLogin: session.login,
            txHash: metered.value.txHash,
            at: new Date().toISOString(),
          }),
        );
      }

      if (target.skillHash) {
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
        skillHash: target.skillHash,
        txHash: metered.value.txHash,
        blockNumber: metered.value.blockNumber,
        replay: metered.replay,
        explorer: `https://testnet.monadexplorer.com/tx/${metered.value.txHash}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return c.json({ error: msg }, 500);
    }
  },
);
