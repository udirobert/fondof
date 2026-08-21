import { describe, expect, it } from "vitest";
import {
  FREE_FORGE_LIMIT,
  billingMonth,
  grantVerifiedShareBenefit,
  inspectForgeEntitlement,
  meteredGenerate,
  releaseForgeQuota,
  reserveForgeQuota,
} from "./forge-quota.js";

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

function session(userId = 42): { userId: number } {
  return { userId };
}

describe("forge quota", () => {
  it("gives anonymous and free users the advertised monthly allowance", async () => {
    const kv = fakeKV();
    const anon = await inspectForgeEntitlement(kv, null, "203.0.113.9");
    expect(anon).toEqual({
      allowed: true,
      remaining: FREE_FORGE_LIMIT,
      plan: "anonymous",
      limit: FREE_FORGE_LIMIT,
    });

    const free = await inspectForgeEntitlement(kv, session(), "203.0.113.9");
    expect(free.plan).toBe("free");
    expect(free.remaining).toBe(FREE_FORGE_LIMIT);
  });

  it("does not share quota across IPs or signed-in users", async () => {
    const kv = fakeKV();
    const a = await reserveForgeQuota(kv, null, "203.0.113.1");
    expect(a.allowed).toBe(true);
    const b = await inspectForgeEntitlement(kv, null, "203.0.113.2");
    expect(b.remaining).toBe(FREE_FORGE_LIMIT);
    const signed = await inspectForgeEntitlement(kv, session(), "203.0.113.1");
    expect(signed.remaining).toBe(FREE_FORGE_LIMIT);
  });

  it("rejects a fourth counted forge and keeps the counter at the limit", async () => {
    const kv = fakeKV();
    for (let i = 0; i < FREE_FORGE_LIMIT; i++) {
      const slot = await reserveForgeQuota(kv, session(), "203.0.113.9");
      expect(slot.allowed).toBe(true);
      expect(slot.reserved).toBe(true);
    }
    const denied = await reserveForgeQuota(kv, session(), "203.0.113.9");
    expect(denied.allowed).toBe(false);
    expect(denied.reserved).toBe(false);
    expect(denied.entitlement.remaining).toBe(0);
    expect(await kv.get(`usage:42:${billingMonth()}`)).toBe(String(FREE_FORGE_LIMIT));
  });

  it("releases a reservation when generation fails", async () => {
    const kv = fakeKV();
    const slot = await reserveForgeQuota(kv, session(), "1.1.1.1");
    await releaseForgeQuota(kv, slot);
    const after = await inspectForgeEntitlement(kv, session(), "1.1.1.1");
    expect(after.remaining).toBe(FREE_FORGE_LIMIT);
  });

  it("does not consume quota for a fully cached generation", async () => {
    const kv = fakeKV();
    const result = await meteredGenerate(kv, session(), "1.1.1.1", async () => ({
      kind: "ok" as const,
      cacheHit: true,
      value: "cached",
    }));
    expect(result.ok).toBe(true);
    const after = await inspectForgeEntitlement(kv, session(), "1.1.1.1");
    expect(after.remaining).toBe(FREE_FORGE_LIMIT);
  });

  it("consumes quota only after a successful uncached generation", async () => {
    const kv = fakeKV();
    const result = await meteredGenerate(kv, session(), "1.1.1.1", async () => ({
      kind: "ok" as const,
      cacheHit: false,
      value: "fresh",
    }));
    expect(result.ok).toBe(true);
    const after = await inspectForgeEntitlement(kv, session(), "1.1.1.1");
    expect(after.remaining).toBe(FREE_FORGE_LIMIT - 1);
  });

  it("releases quota when generation throws", async () => {
    const kv = fakeKV();
    await expect(
      meteredGenerate(kv, session(), "1.1.1.1", async () => {
        throw new Error("llm down");
      }),
    ).rejects.toThrow("llm down");
    const after = await inspectForgeEntitlement(kv, session(), "1.1.1.1");
    expect(after.remaining).toBe(FREE_FORGE_LIMIT);
  });

  it("does not meter Pro or verified sharers", async () => {
    const kv = fakeKV();
    await kv.put("plan:42", "pro");
    const pro = await reserveForgeQuota(kv, session(), "1.1.1.1");
    expect(pro.reserved).toBe(false);
    expect(pro.entitlement.plan).toBe("pro");

    await kv.delete("plan:42");
    await grantVerifiedShareBenefit(kv, 42, "abc", "twitter");
    const sharer = await inspectForgeEntitlement(kv, session(), "1.1.1.1");
    expect(sharer.plan).toBe("sharer");
    expect(sharer.remaining).toBeNull();
  });
});
