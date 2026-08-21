import { afterEach, describe, expect, it, vi } from "vitest";
import { composeRoute } from "./compose.js";

vi.mock("./ingest.js", () => ({
  runIngestPipeline: async () => ({
    contentType: "article",
    sourceHash: "ab".repeat(32),
    title: "Retry budgets",
    ideas: [
      {
        title: "Retry budgets",
        description: "Cap aggregate retries.",
        domain: ["reliability"],
        applicability: ["typescript"],
        patternType: "technique",
        sourceUrl: "https://example.com/retry-budgets",
        sourceHash: "ab".repeat(32),
        id: "idea-1",
        embedding: [],
      },
    ],
    textLength: 80,
    existingSkills: [],
    cacheHit: false,
    providers: ["html"],
  }),
  runNeedPipeline: async () => {
    throw new Error("need pipeline unused in these tests");
  },
  needUrl: (need: string) => `need://${encodeURIComponent(need)}`,
}));

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

const SKILL_MD = `# Test Skill
## Context
A short context.
## Guidance
Do the thing.
## Anti-patterns
- Don't skip tests
## References
- https://example.com/retry-budgets
`;

function envWith(kv: KVNamespace) {
  return {
    SESSIONS: kv,
    FRONTEND_URL: "https://fondof.netlify.app",
    AI: { run: async () => ({ response: SKILL_MD }) },
  } as never;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /compose public share", () => {
  it("returns a skillUrl only when the public record exists", async () => {
    const kv = fakeKV();
    const res = await composeRoute.request(
      "/compose",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.31",
        },
        body: JSON.stringify({
          url: "https://example.com/retry-budgets",
          private: false,
        }),
      },
      envWith(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      private: boolean;
      skillUrl: string | null;
      skillHash: string;
    };
    expect(body.private).toBe(false);
    expect(body.skillUrl).toBe(
      `https://fondof.netlify.app/s/${body.skillHash}`,
    );
    expect(await kv.get(`pub-skill:${body.skillHash}`, "json")).toBeTruthy();
  });

  it("keeps skillUrl null when the registry write fails", async () => {
    const store = new Map<string, string>();
    const kv = {
      get: async (key: string, type?: "text" | "json") => {
        const value = store.get(key);
        if (value === undefined) return null;
        return type === "json" ? JSON.parse(value) : value;
      },
      put: async (key: string, value: string) => {
        if (String(key).startsWith("pub-skill:")) {
          throw new Error("kv unavailable");
        }
        store.set(key, value);
      },
      delete: async (key: string) => {
        store.delete(key);
      },
    } as unknown as KVNamespace;

    const res = await composeRoute.request(
      "/compose",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.32",
        },
        body: JSON.stringify({
          url: "https://example.com/retry-budgets",
          private: false,
        }),
      },
      envWith(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      private: boolean;
      skillUrl: string | null;
      markdown: string;
    };
    expect(body.private).toBe(true);
    expect(body.skillUrl).toBeNull();
    expect(body.markdown).toContain("Test Skill");
  });
});
