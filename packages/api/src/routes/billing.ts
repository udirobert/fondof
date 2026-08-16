import { Hono } from "hono";
import type { Env } from "../index.js";
import { billingMonth, resolveSession } from "./auth.js";

export const billingRoute = new Hono<{ Bindings: Env }>();

const FREE_FORGE_LIMIT = 3;

/**
 * POST /billing/check-forge — check if user can forge.
 * Logic: Pro → unlimited. Shared this month → unlimited. Else free tier limit.
 */
billingRoute.post("/billing/check-forge", async (c) => {
  const auth = c.req.header("Authorization");
  const session = await resolveSession(auth, c.env.SESSIONS);

  if (!session) {
    return c.json({ allowed: true, remaining: FREE_FORGE_LIMIT, plan: "anonymous" });
  }

  const planRaw = await c.env.SESSIONS.get(`plan:${session.userId}`);
  const plan = planRaw || "free";

  if (plan === "pro") {
    return c.json({ allowed: true, remaining: null, plan: "pro" });
  }

  // Check if user has shared this month → unlocks unlimited
  const shareKey = `shared:${session.userId}:${billingMonth()}`;
  const hasShared = await c.env.SESSIONS.get(shareKey);
  if (hasShared) {
    return c.json({ allowed: true, remaining: null, plan: "sharer" });
  }

  const usageKey = `usage:${session.userId}:${billingMonth()}`;
  const usageRaw = await c.env.SESSIONS.get(usageKey);
  const forgeCount = usageRaw ? parseInt(usageRaw, 10) : 0;

  if (forgeCount >= FREE_FORGE_LIMIT) {
    return c.json({ allowed: false, remaining: 0, plan: "free" });
  }

  return c.json({ allowed: true, remaining: FREE_FORGE_LIMIT - forgeCount, plan: "free" });
});

/**
 * POST /billing/record-share — user shared a skill publicly.
 * Unlocks unlimited forges for the current billing month.
 * Body: { skillHash, platform: "twitter" | "linkedin" | "github" }
 */
billingRoute.post("/billing/record-share", async (c) => {
  const auth = c.req.header("Authorization");
  const session = await resolveSession(auth, c.env.SESSIONS);

  if (!session) {
    return c.json({ error: "Sign in to unlock sharing benefits" }, 401);
  }

  const body = await c.req.json<{
    skillHash?: string;
    platform?: string;
  }>().catch(() => ({ skillHash: undefined, platform: undefined }));

  const shareKey = `shared:${session.userId}:${billingMonth()}`;
  const shareData = JSON.stringify({
    firstSharedAt: Date.now(),
    skillHash: body.skillHash || null,
    platform: body.platform || "unknown",
  });

  await c.env.SESSIONS.put(shareKey, shareData, {
    expirationTtl: 60 * 60 * 24 * 35,
  });

  // Also store in the user's skill list for portfolio
  if (body.skillHash) {
    const skillsKey = `user-skills:${session.userId}`;
    const existing = await c.env.SESSIONS.get(skillsKey, "json") as string[] | null;
    const skills = existing || [];
    if (!skills.includes(body.skillHash)) {
      skills.push(body.skillHash);
      await c.env.SESSIONS.put(skillsKey, JSON.stringify(skills), {
        expirationTtl: 60 * 60 * 24 * 365, // 1 year
      });
    }
  }

  return c.json({ ok: true, plan: "sharer", remaining: null });
});

/**
 * POST /billing/record-forge — increment forge counter for the user.
 * Called by the forge route after a successful forge.
 */
billingRoute.post("/billing/record-forge", async (c) => {
  const auth = c.req.header("Authorization");
  const session = await resolveSession(auth, c.env.SESSIONS);

  if (!session) return c.json({ ok: true }); // anonymous, no tracking

  const usageKey = `usage:${session.userId}:${billingMonth()}`;
  const usageRaw = await c.env.SESSIONS.get(usageKey);
  const current = usageRaw ? parseInt(usageRaw, 10) : 0;

  await c.env.SESSIONS.put(usageKey, String(current + 1), {
    expirationTtl: 60 * 60 * 24 * 35, // slightly longer than a month
  });

  return c.json({ ok: true, forgeCount: current + 1 });
});

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
 * Activates/deactivates Pro plan in KV.
 */
billingRoute.post("/billing/webhook", async (c) => {
  if (!c.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: "Webhook not configured" }, 503);
  }

  const sig = c.req.header("stripe-signature");
  if (!sig) return c.json({ error: "No signature" }, 400);

  // In production, verify the webhook signature using the Stripe-Signature header.
  // For the initial build, we trust the request and parse the body.
  // TODO: Add proper signature verification with crypto.subtle.
  const event = await c.req.json<{
    type: string;
    data: {
      object: {
        client_reference_id?: string;
        customer?: string;
        metadata?: { github_id?: string };
        status?: string;
      };
    };
  }>();

  const obj = event.data.object;

  if (event.type === "checkout.session.completed") {
    const userId = obj.client_reference_id || obj.metadata?.github_id;
    if (userId) {
      await c.env.SESSIONS.put(`plan:${userId}`, "pro");
    }
  }

  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.paused"
  ) {
    const userId = obj.metadata?.github_id;
    if (userId) {
      await c.env.SESSIONS.put(`plan:${userId}`, "free");
    }
  }

  return c.json({ received: true });
});
