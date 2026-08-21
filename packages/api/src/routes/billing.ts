import { Hono } from "hono";
import type { Env } from "../index.js";
import {
  planChangeFromStripeEvent,
  stripeCustomerId,
  stripeEventId,
  stripeSubscriptionId,
  verifyStripeWebhook,
  type StripeWebhookEvent,
} from "../lib/stripe-webhook.js";
import {
  grantVerifiedShareBenefit,
  inspectForgeEntitlement,
} from "../lib/forge-quota.js";
import { clientIp } from "../lib/rate-limit.js";
import { getPublicSkill } from "../lib/skill-registry.js";
import { resolveSession } from "./auth.js";

export const billingRoute = new Hono<{ Bindings: Env }>();

/**
 * POST /billing/check-forge — read-only remaining allowance for the UI.
 * Enforcement lives in /forge and /compose; this must not grant capacity.
 */
billingRoute.post("/billing/check-forge", async (c) => {
  const session = await resolveSession(
    c.req.header("Authorization"),
    c.env.SESSIONS,
  );
  const entitlement = await inspectForgeEntitlement(
    c.env.SESSIONS,
    session,
    clientIp(c.req.raw),
  );
  return c.json(entitlement);
});

/**
 * POST /billing/record-share — unlock unlimited forges after a verified
 * public share of a skill the signed-in user owns. Claiming an arbitrary
 * hash (or a skill that is still private) does not grant the benefit.
 * Body: { skillHash, platform?: "twitter" | "linkedin" | "github" }
 */
billingRoute.post("/billing/record-share", async (c) => {
  const session = await resolveSession(
    c.req.header("Authorization"),
    c.env.SESSIONS,
  );

  if (!session) {
    return c.json({ error: "Sign in to unlock sharing benefits" }, 401);
  }

  const body = await c.req.json<{
    skillHash?: string;
    platform?: string;
  }>().catch(() => ({ skillHash: undefined, platform: undefined }));

  const skillHash = body.skillHash?.trim().toLowerCase().replace(/^0x/, "");
  if (!skillHash) {
    return c.json({ error: "skillHash is required" }, 400);
  }

  const record = await getPublicSkill(c.env, skillHash);
  if (!record || record.ownerId !== session.userId) {
    return c.json(
      { error: "Share a public skill you own to unlock this benefit" },
      403,
    );
  }

  const platform = body.platform || "unknown";
  await grantVerifiedShareBenefit(
    c.env.SESSIONS,
    session.userId,
    skillHash,
    platform,
  );

  return c.json({ ok: true, plan: "sharer", remaining: null });
});

/**
 * POST /billing/record-forge — removed. Usage is reserved and finalized by
 * /forge and /compose so clients cannot skip accounting.
 */
billingRoute.post("/billing/record-forge", (c) =>
  c.json(
    {
      error: "Usage is recorded by /forge and /compose; this endpoint is closed.",
      code: "gone",
    },
    410,
  ),
);

/**
 * POST /billing/checkout — create a Stripe Checkout session for Pro upgrade.
 * Returns { url } for the frontend to redirect to.
 */
billingRoute.post("/billing/checkout", async (c) => {
  const auth = c.req.header("Authorization");
  const session = await resolveSession(auth, c.env.SESSIONS);

  if (!session) {
    return c.json({ error: "Sign in to upgrade" }, 401);
  }

  if (!c.env.STRIPE_SECRET_KEY) {
    return c.json({ error: "Payments not configured" }, 503);
  }

  const frontendUrl = c.env.FRONTEND_URL || "https://fondof.netlify.app";

  // Create Stripe Checkout Session via REST API (no SDK needed in Workers)
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": c.env.STRIPE_PRICE_ID || "price_fondof_pro",
      "line_items[0][quantity]": "1",
      success_url: `${frontendUrl}/?upgraded=1`,
      cancel_url: `${frontendUrl}/?upgrade_cancelled=1`,
      client_reference_id: String(session.userId),
      "metadata[github_login]": session.login,
      "metadata[github_id]": String(session.userId),
      // Copy identity onto the Subscription so cancel/pause webhooks can revoke Pro.
      "subscription_data[metadata][github_id]": String(session.userId),
      "subscription_data[metadata][github_login]": session.login,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json({ error: "Stripe error", detail: err.slice(0, 200) }, 502);
  }

  const checkout = (await res.json()) as { url: string };
  return c.json({ url: checkout.url });
});

/**
 * POST /billing/webhook — Stripe webhook for subscription events.
 * Activates/deactivates Pro plan in KV only after HMAC verification
 * and a completed payment (never from an unsigned or unpaid payload).
 */
billingRoute.post("/billing/webhook", async (c) => {
  if (!c.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: "Webhook not configured" }, 503);
  }

  const payload = await c.req.text();
  const verified = await verifyStripeWebhook(
    payload,
    c.req.header("stripe-signature"),
    c.env.STRIPE_WEBHOOK_SECRET,
  );
  if (!verified.ok) {
    return c.json({ error: "Invalid signature" }, 400);
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const eventId = stripeEventId(event);
  if (eventId) {
    const seen = await c.env.SESSIONS.get(`stripe-event:${eventId}`);
    if (seen) return c.json({ received: true, duplicate: true });
  }

  const mappedUserId = await resolveStripeUserId(c.env.SESSIONS, event);
  const change = planChangeFromStripeEvent(event, mappedUserId);
  const userId = change?.userId || mappedUserId;
  if (userId) {
    await persistStripeUserMapping(c.env.SESSIONS, event, userId);
  }
  if (change) {
    await c.env.SESSIONS.put(`plan:${change.userId}`, change.plan);
  }

  if (eventId) {
    await c.env.SESSIONS.put(`stripe-event:${eventId}`, "1", {
      expirationTtl: 60 * 60 * 24 * 30,
    });
  }

  return c.json({ received: true });
});

function stripeCustomerKey(customerId: string): string {
  return `stripe-user:customer:${customerId}`;
}

function stripeSubKey(subscriptionId: string): string {
  return `stripe-user:sub:${subscriptionId}`;
}

async function resolveStripeUserId(
  kv: KVNamespace,
  event: StripeWebhookEvent,
): Promise<string | null> {
  const sub = stripeSubscriptionId(event);
  if (sub) {
    const userId = await kv.get(stripeSubKey(sub));
    if (userId) return userId;
  }
  const customer = stripeCustomerId(event.data.object);
  if (customer) {
    const userId = await kv.get(stripeCustomerKey(customer));
    if (userId) return userId;
  }
  return null;
}

async function persistStripeUserMapping(
  kv: KVNamespace,
  event: StripeWebhookEvent,
  userId: string,
): Promise<void> {
  const customer = stripeCustomerId(event.data.object);
  if (customer) await kv.put(stripeCustomerKey(customer), userId);
  const sub = stripeSubscriptionId(event);
  if (sub) await kv.put(stripeSubKey(sub), userId);
}
