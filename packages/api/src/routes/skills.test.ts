import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sha256Hex } from "../lib/edge-cache.js";
import { skillsRoute } from "./skills.js";

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
  return { SESSIONS: kv } as never;
}

function sessionJson(userId = 42, login = "ada") {
  return JSON.stringify({
    userId,
    login,
    avatarUrl: "",
    name: login,
    accessToken: "secret",
    createdAt: Date.now(),
  });
}

const markdown = "# Retry Budgets\n\nKeep retries bounded.\n";

beforeEach(() => {
  vi.stubGlobal("caches", {
    default: {
      delete: async () => false,
      match: async () => undefined,
      put: async () => undefined,
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /skills/:hash/share ownership", () => {
  it("lets a first share create a public record", async () => {
    const kv = fakeKV();
    await kv.put("session:token", sessionJson());
    const hash = await sha256Hex(markdown);
    const res = await skillsRoute.request(
      `/skills/${hash}/share`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({
          title: "Retry Budgets",
          markdown,
          sourceUrls: ["https://example.com/a"],
        }),
      },
      envWith(kv),
    );
    expect(res.status).toBe(200);
    const stored = JSON.parse(
      (await kv.get(`pub-skill:${hash}`)) as string,
    ) as { ownerId: number; title: string };
    expect(stored.ownerId).toBe(42);
    expect(stored.title).toBe("Retry Budgets");
  });

  it("rejects a takeover of an existing public artifact", async () => {
    const kv = fakeKV();
    const hash = await sha256Hex(markdown);
    await kv.put("session:token", sessionJson(7, "mallory"));
    await kv.put(
      `pub-skill:${hash}`,
      JSON.stringify({
        hash,
        title: "Retry Budgets",
        markdown,
        sourceUrls: ["https://example.com/a"],
        sourceHashes: [],
        composedAt: "2026-08-19T12:00:00.000Z",
        visibility: "public",
        ownerId: 42,
        ownerLogin: "ada",
        onChain: false,
      }),
    );

    const res = await skillsRoute.request(
      `/skills/${hash}/share`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({
          title: "Hijacked",
          markdown,
          repo: "evil/repo",
        }),
      },
      envWith(kv),
    );
    expect(res.status).toBe(403);
    const stored = JSON.parse(
      (await kv.get(`pub-skill:${hash}`)) as string,
    ) as { ownerId: number; title: string; repo?: string };
    expect(stored.ownerId).toBe(42);
    expect(stored.title).toBe("Retry Budgets");
    expect(stored.repo).toBeUndefined();
  });

  it("lets the owner re-share and keeps ownership", async () => {
    const kv = fakeKV();
    const hash = await sha256Hex(markdown);
    await kv.put("session:token", sessionJson());
    await kv.put(
      `pub-skill:${hash}`,
      JSON.stringify({
        hash,
        title: "Retry Budgets",
        markdown,
        sourceUrls: [],
        sourceHashes: [],
        composedAt: "2026-08-19T12:00:00.000Z",
        visibility: "unlisted",
        ownerId: 42,
        ownerLogin: "ada",
        onChain: false,
      }),
    );

    const res = await skillsRoute.request(
      `/skills/${hash}/share`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ title: "Retry Budgets v2", markdown }),
      },
      envWith(kv),
    );
    expect(res.status).toBe(200);
    const stored = JSON.parse(
      (await kv.get(`pub-skill:${hash}`)) as string,
    ) as { ownerId: number; ownerLogin: string; title: string; visibility: string };
    expect(stored.ownerId).toBe(42);
    expect(stored.ownerLogin).toBe("ada");
    expect(stored.title).toBe("Retry Budgets v2");
    expect(stored.visibility).toBe("public");
  });

  it("does not treat an ownerless public record as writable", async () => {
    const kv = fakeKV();
    const hash = await sha256Hex(markdown);
    await kv.put("session:token", sessionJson());
    await kv.put(
      `pub-skill:${hash}`,
      JSON.stringify({
        hash,
        title: "Legacy",
        markdown,
        sourceUrls: [],
        sourceHashes: [],
        composedAt: "2026-08-19T12:00:00.000Z",
        visibility: "public",
        onChain: false,
      }),
    );

    const res = await skillsRoute.request(
      `/skills/${hash}/share`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ title: "Claimed", markdown }),
      },
      envWith(kv),
    );
    expect(res.status).toBe(403);
    const stored = JSON.parse(
      (await kv.get(`pub-skill:${hash}`)) as string,
    ) as { ownerId?: number; title: string };
    expect(stored.ownerId).toBeUndefined();
    expect(stored.title).toBe("Legacy");
  });
});
