import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryCoordinator } from "../durable/coordinator.js";
import { composeRoute, resolveComposeUrls } from "./compose.js";

const ingestCalls: string[] = [];

vi.mock("./ingest.js", () => ({
  runIngestPipeline: async (url: string) => {
    ingestCalls.push(url);
    if (url.includes("empty")) {
      return {
        contentType: "article",
        sourceHash: "cd".repeat(32),
        title: "Empty",
        ideas: [],
        textLength: 10,
        existingSkills: [],
        cacheHit: false,
        providers: ["html"],
      };
    }
    if (url.includes("fail-hard")) {
      throw new Error("upstream down");
    }
    const isBlog = url.includes("blog");
    return {
      contentType: isBlog ? "article" : "youtube",
      sourceHash: (isBlog ? "bb" : "aa").repeat(32),
      title: isBlog ? "Remotion blog" : "Remotion talk",
      ideas: [
        {
          title: isBlog ? "Scene folders" : "VO-first timeline",
          description: isBlog
            ? "Keep per-scene props and a shared plate."
            : "Map each VO line to one visual beat.",
          domain: ["video"],
          applicability: isBlog ? ["remotion", "react"] : ["remotion"],
          patternType: "technique",
          sourceUrl: url,
          sourceHash: (isBlog ? "bb" : "aa").repeat(32),
          id: isBlog ? "idea-blog" : "idea-yt",
          embedding: [],
        },
      ],
      textLength: 80,
      existingSkills: [],
      cacheHit: false,
      providers: ["html"],
    };
  },
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
    COORDINATOR: createMemoryCoordinator({ SESSIONS: kv }),
    FORGE_ANON_SALT: "test-salt",
    FRONTEND_URL: "https://fondof.netlify.app",
    AI: { run: async () => ({ response: SKILL_MD }) },
  } as never;
}

beforeEach(() => {
  ingestCalls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveComposeUrls", () => {
  it("merges url + urls and dedupes by normalized identity", () => {
    expect(
      resolveComposeUrls({
        url: "https://youtu.be/7wuYBfE131U",
        urls: [
          "https://www.youtube.com/watch?v=7wuYBfE131U",
          "https://example.com/blog?utm_source=x",
          "https://example.com/blog",
        ],
      }),
    ).toEqual([
      "https://www.youtube.com/watch?v=7wuYBfE131U",
      "https://example.com/blog?utm_source=x",
    ]);
  });

  it("caps at 4 sources", () => {
    const urls = [
      "https://a.example/1",
      "https://a.example/2",
      "https://a.example/3",
      "https://a.example/4",
      "https://a.example/5",
    ];
    expect(resolveComposeUrls({ urls })).toHaveLength(4);
  });
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
      sourceUrls: string[];
    };
    expect(body.private).toBe(false);
    expect(body.skillUrl).toBe(
      `https://fondof.netlify.app/s/${body.skillHash}`,
    );
    expect(body.sourceUrls).toEqual(["https://example.com/retry-budgets"]);
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

describe("POST /compose multi-source", () => {
  it("ingests urls[] once and forges a single skill", async () => {
    const kv = fakeKV();
    const res = await composeRoute.request(
      "/compose",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.40",
        },
        body: JSON.stringify({
          urls: [
            "https://www.youtube.com/watch?v=7wuYBfE131U",
            "https://example.com/blog/remotion",
          ],
          topShards: 2,
        }),
      },
      envWith(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      markdown: string;
      sourceUrl: string;
      sourceUrls: string[];
      sourceTitle: string;
      contentType: string;
      ideas: Array<{ title: string }>;
      totalIdeasCount: number;
    };
    expect(ingestCalls).toHaveLength(2);
    expect(body.sourceUrls).toEqual([
      "https://www.youtube.com/watch?v=7wuYBfE131U",
      "https://example.com/blog/remotion",
    ]);
    expect(body.sourceUrl).toBe(body.sourceUrls[0]);
    expect(body.sourceTitle).toContain("+");
    expect(body.contentType).toBe("mixed");
    expect(body.totalIdeasCount).toBe(2);
    expect(body.ideas.length).toBe(2);
    expect(body.markdown).toContain("Test Skill");
  });

  it("rejects more than 4 urls", async () => {
    const res = await composeRoute.request(
      "/compose",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.41",
        },
        body: JSON.stringify({
          urls: [
            "https://a.example/1",
            "https://a.example/2",
            "https://a.example/3",
            "https://a.example/4",
            "https://a.example/5",
          ],
        }),
      },
      envWith(fakeKV()),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/at most 4/);
  });

  it("rejects urls combined with need", async () => {
    const res = await composeRoute.request(
      "/compose",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.42",
        },
        body: JSON.stringify({
          urls: ["https://example.com/a"],
          need: "retry budgets",
        }),
      },
      envWith(fakeKV()),
    );
    expect(res.status).toBe(400);
  });

  it("succeeds when one source fails if another yields ideas", async () => {
    const res = await composeRoute.request(
      "/compose",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.43",
        },
        body: JSON.stringify({
          urls: [
            "https://example.com/fail-hard",
            "https://example.com/blog/ok",
          ],
        }),
      },
      envWith(fakeKV()),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sourceUrls: string[];
      sourceFailures: Array<{ url: string; error: string }>;
      totalIdeasCount: number;
    };
    expect(body.sourceUrls).toEqual(["https://example.com/blog/ok"]);
    expect(body.sourceFailures).toEqual([
      { url: "https://example.com/fail-hard", error: "upstream down" },
    ]);
    expect(body.totalIdeasCount).toBe(1);
  });

  it("returns 422 when every source is empty", async () => {
    const res = await composeRoute.request(
      "/compose",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.44",
        },
        body: JSON.stringify({
          urls: ["https://example.com/empty-a", "https://example.com/empty-b"],
        }),
      },
      envWith(fakeKV()),
    );
    expect(res.status).toBe(422);
  });
});
