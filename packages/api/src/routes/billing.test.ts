import { describe, expect, it } from "vitest";
import { createMemoryCoordinator } from "../durable/coordinator.js";
import { billingMonth } from "../lib/forge-quota.js";
import { computeStripeSignature } from "../lib/stripe-webhook.js";
import { billingRoute } from "./billing.js";

const SECRET = "whsec_test_secret";

function fakeKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string, type?: "text" | "json") => {
      const value = store.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

function envWith(kv: KVNamespace) {
  return {
    SESSIONS: kv,
    COORDINATOR: createMemoryCoordinator({ SESSIONS: kv }),
    FORGE_ANON_SALT: "test-salt",
    FRONTEND_URL: "https://fondof.netlify.app",
    STRIPE_WEBHOOK_SECRET: SECRET,
  } as never;
}

async function signedWebhook(
  payload: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<{ body: string; headers: Record<string, string> }> {
  const v1 = await computeStripeSignature(SECRET, timestamp, payload);
  return {
    body: payload,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${v1}`,
    },
  };
}

describe("POST /billing/webhook", () => {
  it("rejects an unsigned event and does not mark the account Pro", async () => {
    const kv = fakeKV();
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "42",
          payment_status: "paid",
        },
      },
    });

    const response = await billingRoute.request(
      "/billing/webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      },
      envWith(kv),
    );

    expect(response.status).toBe(400);
    expect(await kv.get("plan:42")).toBeNull();
  });

  it("rejects a forged signature and does not mark the account Pro", async () => {
    const kv = fakeKV();
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "42",
          payment_status: "paid",
        },
      },
    });

    const response = await billingRoute.request(
      "/billing/webhook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "t=1700000000,v1=deadbeef",
        },
        body: payload,
      },
      envWith(kv),
    );

    expect(response.status).toBe(400);
    expect(await kv.get("plan:42")).toBeNull();
  });

  it("does not grant Pro for a signed but unpaid checkout", async () => {
    const kv = fakeKV();
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "42",
          payment_status: "unpaid",
        },
      },
    });
    const signed = await signedWebhook(payload);

    const response = await billingRoute.request(
      "/billing/webhook",
      { method: "POST", ...signed },
      envWith(kv),
    );

    expect(response.status).toBe(200);
    expect(await kv.get("plan:42")).toBeNull();
  });

  it("grants Pro only after a signed paid checkout", async () => {
    const kv = fakeKV();
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "42",
          payment_status: "paid",
        },
      },
    });
    const signed = await signedWebhook(payload);

    const response = await billingRoute.request(
      "/billing/webhook",
      { method: "POST", ...signed },
      envWith(kv),
    );

    expect(response.status).toBe(200);
    expect(await kv.get("plan:42")).toBe("pro");
  });

  it("stores a customer/subscription mapping and revokes Pro without subscription metadata", async () => {
    const kv = fakeKV();
    const paid = JSON.stringify({
      id: "evt_paid",
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "42",
          payment_status: "paid",
          customer: "cus_ada",
          subscription: "sub_ada",
        },
      },
    });
    const paidRes = await billingRoute.request(
      "/billing/webhook",
      { method: "POST", ...(await signedWebhook(paid)) },
      envWith(kv),
    );
    expect(paidRes.status).toBe(200);
    expect(await kv.get("plan:42")).toBe("pro");
    expect(await kv.get("stripe-user:customer:cus_ada")).toBe("42");
    expect(await kv.get("stripe-user:sub:sub_ada")).toBe("42");

    const canceled = JSON.stringify({
      id: "evt_cancel",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_ada", customer: "cus_ada" } },
    });
    const cancelRes = await billingRoute.request(
      "/billing/webhook",
      { method: "POST", ...(await signedWebhook(canceled)) },
      envWith(kv),
    );
    expect(cancelRes.status).toBe(200);
    expect(await kv.get("plan:42")).toBe("free");
  });

  it("ignores a replayed Stripe event id", async () => {
    const kv = fakeKV();
    const payload = JSON.stringify({
      id: "evt_once",
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "42",
          payment_status: "paid",
        },
      },
    });
    const signed = await signedWebhook(payload);
    const first = await billingRoute.request(
      "/billing/webhook",
      { method: "POST", ...signed },
      envWith(kv),
    );
    expect(first.status).toBe(200);
    await kv.put("plan:42", "free");
    const replay = await billingRoute.request(
      "/billing/webhook",
      { method: "POST", ...signed },
      envWith(kv),
    );
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ duplicate: true });
    expect(await kv.get("plan:42")).toBe("free");
  });
});

function sessionJson() {
  return JSON.stringify({
    userId: 42,
    login: "ada",
    avatarUrl: "",
    name: "Ada",
    accessToken: "secret",
    createdAt: Date.now(),
  });
}

describe("billing accounting endpoints", () => {
  it("closes client-callable record-forge so usage cannot be skipped or spoofed", async () => {
    const kv = fakeKV();
    await kv.put("session:token", sessionJson());
    const response = await billingRoute.request(
      "/billing/record-forge",
      {
        method: "POST",
        headers: { Authorization: "Bearer token" },
      },
      envWith(kv),
    );
    expect(response.status).toBe(410);
  });

  it("does not unlock sharer status from an unverified share claim", async () => {
    const kv = fakeKV();
    await kv.put("session:token", sessionJson());
    const response = await billingRoute.request(
      "/billing/record-share",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ skillHash: "deadbeef", platform: "twitter" }),
      },
      envWith(kv),
    );
    expect(response.status).toBe(403);
    expect(await kv.get(`shared:42:${billingMonth()}`)).toBeNull();
  });

  it("unlocks sharer status only for a public skill the user owns", async () => {
    const kv = fakeKV();
    await kv.put("session:token", sessionJson());
    await kv.put(
      "pub-skill:abc123",
      JSON.stringify({
        hash: "abc123",
        title: "Owned",
        markdown: "# Owned",
        sourceUrls: [],
        sourceHashes: [],
        composedAt: new Date().toISOString(),
        visibility: "public",
        ownerId: 42,
        onChain: false,
      }),
    );

    const response = await billingRoute.request(
      "/billing/record-share",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ skillHash: "abc123", platform: "twitter" }),
      },
      envWith(kv),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, plan: "sharer" });
    expect(await kv.get(`shared:42:${billingMonth()}`)).toBeTruthy();
  });
});
