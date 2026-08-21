import { afterEach, describe, expect, it, vi } from "vitest";
import { githubPublishRoute } from "./github-publish.js";

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
  return { SESSIONS: kv, FRONTEND_URL: "https://fondof.netlify.app" } as never;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /publish/github", () => {
  it("asks for incremental GitHub authorization when the session lacks gist scope", async () => {
    const kv = fakeKV();
    await kv.put(
      "session:token",
      JSON.stringify({
        userId: 7,
        login: "ada",
        avatarUrl: "",
        name: "Ada",
        accessToken: "gho_profile_only",
        createdAt: Date.now(),
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ login: "ada" }), {
          status: 200,
          headers: { "X-OAuth-Scopes": "read:user" },
        }),
      ),
    );

    const res = await githubPublishRoute.request(
      "/publish/github",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markdown: "# Skill", title: "Skill" }),
      },
      envWith(kv),
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as {
      code?: string;
      missing?: string[];
      authorizeUrl?: string;
    };
    expect(body.code).toBe("github_scope_required");
    expect(body.missing).toContain("gist");
    expect(body.authorizeUrl).toContain("/api/auth/github?intent=publish");
  });
});
