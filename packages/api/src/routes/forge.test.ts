import { afterEach, describe, expect, it, vi } from "vitest";
import { billingMonth, FREE_FORGE_LIMIT } from "../lib/forge-quota.js";
import { forgeRoute } from "./forge.js";

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

function kvWithFailingPublicPuts(inner: KVNamespace): KVNamespace {
  return {
    get: inner.get.bind(inner),
    put: async (key: string, value: string, options?: unknown) => {
      if (String(key).startsWith("pub-skill:")) {
        throw new Error("kv unavailable");
      }
      return inner.put(key, value, options as never);
    },
    delete: inner.delete.bind(inner),
  } as unknown as KVNamespace;
}

function kvWithSilentPublicPuts(inner: KVNamespace): KVNamespace {
  return {
    get: inner.get.bind(inner),
    put: async (key: string, value: string, options?: unknown) => {
      if (String(key).startsWith("pub-skill:")) return;
      return inner.put(key, value, options as never);
    },
    delete: inner.delete.bind(inner),
  } as unknown as KVNamespace;
}

const SKILL_MD = `# Test Skill
## Context
A short context.
## Guidance
Do the thing.
## Anti-patterns
- Don't skip tests
## References
- https://example.com/a
`;

function envWith(
  kv: KVNamespace,
  ai: { run: () => Promise<unknown> } = {
    run: async () => ({ response: SKILL_MD }),
  },
) {
  return { SESSIONS: kv, AI: ai } as never;
}

const ideaBody = JSON.stringify({
  ideas: [
    {
      title: "Retry budgets",
      description: "Cap aggregate retries.",
      sourceUrl: "https://fondof.local/demo",
    },
  ],
  private: true,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /forge quota", () => {
  it("meters anonymous generation and rejects the fourth call", async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    const headers = {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.9",
    };

    for (let i = 0; i < FREE_FORGE_LIMIT; i++) {
      const res = await forgeRoute.request(
        "/forge",
        { method: "POST", headers, body: ideaBody },
        env,
      );
      expect(res.status).toBe(200);
    }

    const blocked = await forgeRoute.request(
      "/forge",
      { method: "POST", headers, body: ideaBody },
      env,
    );
    expect(blocked.status).toBe(402);
    const body = (await blocked.json()) as { code?: string; remaining?: number };
    expect(body.code).toBe("quota_exceeded");
    expect(body.remaining).toBe(0);
    expect(await kv.get(`usage:ip:203.0.113.9:${billingMonth()}`)).toBe(
      String(FREE_FORGE_LIMIT),
    );
  });

  it("does not consume quota when the LLM fails", async () => {
    const kv = fakeKV();
    const env = envWith(kv, {
      run: async () => {
        throw new Error("model unavailable");
      },
    });
    const res = await forgeRoute.request(
      "/forge",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "198.51.100.7",
        },
        body: ideaBody,
      },
      env,
    );
    expect(res.status).toBe(500);
    expect(await kv.get(`usage:ip:198.51.100.7:${billingMonth()}`)).toBeNull();
  });

  it("enforces the signed-in free allowance even if record-forge is skipped", async () => {
    const kv = fakeKV();
    await kv.put(
      "session:token",
      JSON.stringify({
        userId: 7,
        login: "ada",
        avatarUrl: "",
        name: "Ada",
        accessToken: "secret",
        createdAt: Date.now(),
      }),
    );
    const env = envWith(kv);
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer token",
      "CF-Connecting-IP": "203.0.113.9",
    };

    for (let i = 0; i < FREE_FORGE_LIMIT; i++) {
      const res = await forgeRoute.request(
        "/forge",
        { method: "POST", headers, body: ideaBody },
        env,
      );
      expect(res.status).toBe(200);
    }

    const blocked = await forgeRoute.request(
      "/forge",
      { method: "POST", headers, body: ideaBody },
      env,
    );
    expect(blocked.status).toBe(402);
    expect(await kv.get(`usage:7:${billingMonth()}`)).toBe(String(FREE_FORGE_LIMIT));
  });
});

const publicIdeaBody = JSON.stringify({
  ideas: [
    {
      title: "Retry budgets",
      description: "Cap aggregate retries.",
      sourceUrl: "https://example.com/retry-budgets",
    },
  ],
  private: false,
});

describe("POST /forge public registry", () => {
  it("returns private: false only after the durable record reads back", async () => {
    const kv = fakeKV();
    const res = await forgeRoute.request(
      "/forge",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.21",
        },
        body: publicIdeaBody,
      },
      envWith(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      private: boolean;
      skillHash: string;
    };
    expect(body.private).toBe(false);
    expect(await kv.get(`pub-skill:${body.skillHash}`, "json")).toMatchObject({
      hash: body.skillHash,
      visibility: "public",
    });
  });

  it("downgrades to private when the registry put throws", async () => {
    const kv = kvWithFailingPublicPuts(fakeKV());
    const res = await forgeRoute.request(
      "/forge",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.22",
        },
        body: publicIdeaBody,
      },
      envWith(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { private: boolean; skillHash: string };
    expect(body.private).toBe(true);
    expect(await kv.get(`pub-skill:${body.skillHash}`)).toBeNull();
  });

  it("downgrades to private when the registry put is a silent no-op", async () => {
    const kv = kvWithSilentPublicPuts(fakeKV());
    const res = await forgeRoute.request(
      "/forge",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.23",
        },
        body: publicIdeaBody,
      },
      envWith(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { private: boolean; skillHash: string };
    expect(body.private).toBe(true);
    expect(await kv.get(`pub-skill:${body.skillHash}`)).toBeNull();
  });
});
