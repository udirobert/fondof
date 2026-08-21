import { Hono } from "hono";
import type { Env } from "../index.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import {
  inspectRelayerBudget,
  isResolverLogin,
  issueRelayerIntent,
  setRelayerHalt,
  type RelayerOp,
  type RelayerWriteParams,
} from "../lib/relayer-guard.js";
import { resolveSession } from "./auth.js";

export const relayerRoute = new Hono<{ Bindings: Env }>();

const OPS = new Set<RelayerOp>([
  "publish",
  "challenge",
  "use",
  "storm",
  "resolve",
]);

/**
 * POST /relayer/intent — issue a short-lived intent bound to normalized params.
 * Execute endpoints accept the returned id, or issue one themselves.
 */
relayerRoute.post("/relayer/intent", rateLimit("publish"), async (c) => {
  const session = await resolveSession(
    c.req.header("Authorization"),
    c.env.SESSIONS,
  );
  if (!session) {
    return c.json({ error: "Sign in to request a relayer intent" }, 401);
  }

  const body = (await c.req.json<{
    op?: string;
    skillHash?: string;
    sourceHashes?: string[];
    challengeId?: number;
    challengerWon?: boolean;
    count?: number;
  }>().catch(() => ({}))) as {
    op?: string;
    skillHash?: string;
    sourceHashes?: string[];
    challengeId?: number;
    challengerWon?: boolean;
    count?: number;
  };

  const op = body.op as RelayerOp | undefined;
  if (!op || !OPS.has(op)) {
    return c.json({ error: "op must be publish, challenge, use, storm, or resolve" }, 400);
  }
  if (op === "resolve" && !isResolverLogin(session.login, c.env.RESOLVER_LOGINS)) {
    return c.json({ error: "Not an authorized resolver" }, 403);
  }

  const params: RelayerWriteParams = {
    skillHash: body.skillHash,
    sourceHashes: body.sourceHashes,
    challengeId: body.challengeId,
    challengerWon: body.challengerWon,
    count: body.count,
  };
  const issued = await issueRelayerIntent(
    c.env.SESSIONS,
    c.env.RELAYER_HALT,
    session,
    op,
    params,
  );
  if (!issued.ok) return c.json(issued.body, issued.status as 400);
  return c.json({
    intent: issued.value.id,
    op: issued.value.op,
    expiresAt: issued.value.expiresAt,
    replay: issued.replay,
  });
});

relayerRoute.get("/relayer/status", async (c) => {
  const session = await resolveSession(
    c.req.header("Authorization"),
    c.env.SESSIONS,
  );
  if (!session) {
    return c.json({ error: "Sign in to view relayer status" }, 401);
  }
  const budget = await inspectRelayerBudget(c.env.SESSIONS, session.userId);
  return c.json({
    halted: budget.halted,
    day: budget.day,
    account: budget.account,
    global: budget.global,
    resolver: isResolverLogin(session.login, c.env.RESOLVER_LOGINS),
  });
});

relayerRoute.post("/relayer/halt", async (c) => {
  const session = await resolveSession(
    c.req.header("Authorization"),
    c.env.SESSIONS,
  );
  if (!session || !isResolverLogin(session.login, c.env.RESOLVER_LOGINS)) {
    return c.json({ error: "Not an authorized resolver" }, 403);
  }
  const body = await c.req.json<{ halt?: boolean }>().catch(() => ({ halt: true }));
  await setRelayerHalt(c.env.SESSIONS, body.halt !== false);
  return c.json({ halted: body.halt !== false });
});
