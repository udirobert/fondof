import { describe, expect, it } from "vitest";
import { createMemoryCoordinator } from "../durable/coordinator.js";
import {
  FREE_FORGE_LIMIT,
  forgeSubjectKey,
  grantVerifiedShareBenefit,
  inspectForgeEntitlement,
  meteredGenerate,
  quotaExceededBody,
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

function testEnv(kv = fakeKV()) {
  return {
    SESSIONS: kv,
    COORDINATOR: createMemoryCoordinator({ SESSIONS: kv }),
    FORGE_ANON_SALT: "test-salt",
    FRONTEND_URL: "https://fondof.netlify.app",
  } as never;
}

function session(userId = 42): { userId: number } {
  return { userId };
}

describe("forge quota", () => {
  it("gives anonymous and free users the advertised monthly allowance", async () => {
    const env = testEnv();
    const anon = await inspectForgeEntitlement(env, null, "203.0.113.9");
    expect(anon).toEqual({
      allowed: true,
      remaining: FREE_FORGE_LIMIT,
      plan: "anonymous",
      limit: FREE_FORGE_LIMIT,
    });

    const free = await inspectForgeEntitlement(env, session(), "203.0.113.9");
    expect(free.plan).toBe("free");
    expect(free.remaining).toBe(FREE_FORGE_LIMIT);
  });

  it("does not share quota across IPs or signed-in users", async () => {
    const env = testEnv();
    const a = await reserveForgeQuota(env, null, "203.0.113.1");
    expect(a.allowed).toBe(true);
    const b = await inspectForgeEntitlement(env, null, "203.0.113.2");
    expect(b.remaining).toBe(FREE_FORGE_LIMIT);
    const signed = await inspectForgeEntitlement(env, session(), "203.0.113.1");
    expect(signed.remaining).toBe(FREE_FORGE_LIMIT);
  });

  it("rejects after the free allowance and keeps the counter at the limit", async () => {
    const env = testEnv();
    for (let i = 0; i < FREE_FORGE_LIMIT; i++) {
      const slot = await reserveForgeQuota(env, session(), "203.0.113.9");
      expect(slot.allowed).toBe(true);
      expect(slot.reserved).toBe(true);
    }
    const denied = await reserveForgeQuota(env, session(), "203.0.113.9");
    expect(denied.allowed).toBe(false);
    expect(denied.reserved).toBe(false);
    expect(denied.entitlement.remaining).toBe(0);
  });

  it("releases a reservation when generation fails", async () => {
    const env = testEnv();
    const slot = await reserveForgeQuota(env, session(), "1.1.1.1");
    await releaseForgeQuota(env, slot);
    const after = await inspectForgeEntitlement(env, session(), "1.1.1.1");
    expect(after.remaining).toBe(FREE_FORGE_LIMIT);
  });

  it("does not consume quota for a fully cached generation", async () => {
    const env = testEnv();
    const result = await meteredGenerate(env, session(), "1.1.1.1", async () => ({
      kind: "ok" as const,
      cacheHit: true,
      value: "cached",
    }));
    expect(result.ok).toBe(true);
    const after = await inspectForgeEntitlement(env, session(), "1.1.1.1");
    expect(after.remaining).toBe(FREE_FORGE_LIMIT);
  });

  it("consumes quota only after a successful uncached generation", async () => {
    const env = testEnv();
    const result = await meteredGenerate(env, session(), "1.1.1.1", async () => ({
      kind: "ok" as const,
      cacheHit: false,
      value: "fresh",
    }));
    expect(result.ok).toBe(true);
    const after = await inspectForgeEntitlement(env, session(), "1.1.1.1");
    expect(after.remaining).toBe(FREE_FORGE_LIMIT - 1);
  });

  it("releases quota when generation throws", async () => {
    const env = testEnv();
    await expect(
      meteredGenerate(env, session(), "1.1.1.1", async () => {
        throw new Error("llm down");
      }),
    ).rejects.toThrow("llm down");
    const after = await inspectForgeEntitlement(env, session(), "1.1.1.1");
    expect(after.remaining).toBe(FREE_FORGE_LIMIT);
  });

  it("does not meter Pro or verified sharers", async () => {
    const kv = fakeKV();
    const env = testEnv(kv);
    await kv.put("plan:42", "pro");
    const pro = await reserveForgeQuota(env, session(), "1.1.1.1");
    expect(pro.reserved).toBe(false);
    expect(pro.entitlement.plan).toBe("pro");

    await kv.delete("plan:42");
    await grantVerifiedShareBenefit(kv, 42, "abc", "twitter");
    const sharer = await inspectForgeEntitlement(env, session(), "1.1.1.1");
    expect(sharer.plan).toBe("sharer");
    expect(sharer.remaining).toBeNull();
  });

  it("explains unlock paths on quota exceeded", async () => {
    const env = testEnv();
    for (let i = 0; i < FREE_FORGE_LIMIT; i++) {
      await reserveForgeQuota(env, null, "203.0.113.9");
    }
    const denied = await reserveForgeQuota(env, null, "203.0.113.9");
    const body = quotaExceededBody(denied.entitlement);
    expect(body.code).toBe("quota_exceeded");
    expect(body.period).toBe("month");
    expect(body.unlock).toEqual(["sign_in", "share", "pro"]);
    expect(body.login_url).toMatch(/fondof\.netlify\.app/);
    expect(String(body.error)).toMatch(/3\/month/);
    expect(String(body.error)).toMatch(/fondof login/);
  });

  it("hashes anonymous subject keys so raw IPs are not used as storage keys", async () => {
    const env = testEnv();
    const key = await forgeSubjectKey(env, null, "203.0.113.10");
    expect(key).not.toContain("203.0.113.10");
    expect(key).toMatch(/^anon:[a-f0-9]{64}$/);
  });
});
