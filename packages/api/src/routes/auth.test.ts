import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryCoordinator } from "../durable/coordinator.js";
import {
  peekOAuthExchange,
  storeOAuthExchange,
} from "../lib/oauth-exchange.js";
import { authRoute } from "./auth.js";

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
    GITHUB_CLIENT_ID: "client",
    GITHUB_CLIENT_SECRET: "secret",
  } as never;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OAuth redirect allowlist", () => {
  it("stores only a relative app path, even when the query is absolute", async () => {
    const kv = fakeKV();
    const res = await authRoute.request(
      "/auth/github?redirect=https://evil.example/phish",
      { method: "GET" },
      envWith(kv),
    );
    expect(res.status).toBe(302);

    const location = res.headers.get("Location") ?? "";
    expect(location.startsWith("https://github.com/login/oauth/authorize")).toBe(
      true,
    );
    const state = new URL(location).searchParams.get("state") ?? "";
    const stored = JSON.parse(
      (await kv.get(`oauth-state:${state}`)) as string,
    ) as { redirect: string; browserNonce: string };
    expect(stored.redirect).toBe("/");
    expect(stored.browserNonce).toMatch(/^[0-9a-f]{64}$/);

    const cookie = res.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain("fondof_oauth=");
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=none");
  });

  it("keeps a legitimate in-app path", async () => {
    const kv = fakeKV();
    const res = await authRoute.request(
      "/auth/github?redirect=/s/abc",
      { method: "GET" },
      envWith(kv),
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("Location") ?? "";
    const state = new URL(location).searchParams.get("state") ?? "";
    const stored = JSON.parse(
      (await kv.get(`oauth-state:${state}`)) as string,
    ) as { redirect: string };
    expect(stored.redirect).toBe("/s/abc");
  });

  it("requests publish scopes only when intent=publish", async () => {
    const signIn = await authRoute.request(
      "/auth/github",
      { method: "GET" },
      envWith(fakeKV()),
    );
    const signInUrl = new URL(signIn.headers.get("Location") ?? "");
    expect(signInUrl.searchParams.get("scope")).toBe("read:user");

    const publish = await authRoute.request(
      "/auth/github?intent=publish",
      { method: "GET" },
      envWith(fakeKV()),
    );
    const publishUrl = new URL(publish.headers.get("Location") ?? "");
    expect(publishUrl.searchParams.get("scope")).toBe("read:user gist repo");
  });

  it("sends the exchange code to the frontend, not an attacker origin", async () => {
    const kv = fakeKV();
    const state = "abc".repeat(8);
    await kv.put(
      `oauth-state:${state}`,
      JSON.stringify({
        redirect: "https://evil.example/steal",
        browserNonce: "nonce",
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (String(input).includes("github.com/login/oauth/access_token")) {
          return new Response(JSON.stringify({ access_token: "ghs_test" }), {
            status: 200,
          });
        }
        return new Response(
          JSON.stringify({
            id: 1,
            login: "ada",
            avatar_url: "",
            name: "Ada",
          }),
          { status: 200 },
        );
      }),
    );

    const res = await authRoute.request(
      `/auth/callback?code=gh&state=${state}`,
      { method: "GET", headers: { Cookie: "fondof_oauth=nonce" } },
      envWith(kv),
    );
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("Location") ?? "");
    expect(location.origin).toBe("https://fondof.netlify.app");
    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("code")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("POST /auth/exchange", () => {
  it("is single-use and requires the initiating-browser cookie or frontend origin", async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    await storeOAuthExchange(
      env,
      "deadbeef",
      { token: "session-token", browserNonce: "nonce" },
      60,
    );

    const denied = await authRoute.request(
      "/auth/exchange",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "deadbeef" }),
      },
      env,
    );
    expect(denied.status).toBe(401);

    const first = await authRoute.request(
      "/auth/exchange",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "fondof_oauth=nonce",
          Origin: "https://fondof.netlify.app",
        },
        body: JSON.stringify({ code: "deadbeef" }),
      },
      env,
    );
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ token: "session-token" });

    const replay = await authRoute.request(
      "/auth/exchange",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "fondof_oauth=nonce",
          Origin: "https://fondof.netlify.app",
        },
        body: JSON.stringify({ code: "deadbeef" }),
      },
      env,
    );
    expect(replay.status).toBe(401);
  });

  it("allows the frontend Origin when the cookie is blocked", async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    await storeOAuthExchange(
      env,
      "deadbeef",
      { token: "session-token", browserNonce: "nonce" },
      60,
    );
    const res = await authRoute.request(
      "/auth/exchange",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://fondof.netlify.app",
        },
        body: JSON.stringify({ code: "deadbeef" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ token: "session-token" });
  });

  it("rejects a mismatched browser cookie even from the frontend origin", async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    await storeOAuthExchange(
      env,
      "deadbeef",
      { token: "session-token", browserNonce: "nonce" },
      60,
    );
    const res = await authRoute.request(
      "/auth/exchange",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "fondof_oauth=other",
          Origin: "https://fondof.netlify.app",
        },
        body: JSON.stringify({ code: "deadbeef" }),
      },
      env,
    );
    expect(res.status).toBe(401);
    expect(await peekOAuthExchange(env, "deadbeef")).toBeTruthy();
  });

  it("rejects a code presented from another origin", async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    await storeOAuthExchange(
      env,
      "deadbeef",
      { token: "session-token", browserNonce: "nonce" },
      60,
    );
    const res = await authRoute.request(
      "/auth/exchange",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "fondof_oauth=nonce",
          Origin: "https://evil.example",
        },
        body: JSON.stringify({ code: "deadbeef" }),
      },
      env,
    );
    expect(res.status).toBe(401);
    expect(await peekOAuthExchange(env, "deadbeef")).toBeTruthy();
  });

  it("redeems a code only once when two requests race", async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    await storeOAuthExchange(
      env as never,
      "deadbeef",
      { token: "session-token", browserNonce: "nonce" },
      60,
    );

    const headers = {
      "Content-Type": "application/json",
      Cookie: "fondof_oauth=nonce",
      Origin: "https://fondof.netlify.app",
    };
    const req = {
      method: "POST" as const,
      headers,
      body: JSON.stringify({ code: "deadbeef" }),
    };
    const [a, b] = await Promise.all([
      authRoute.request("/auth/exchange", req, env),
      authRoute.request("/auth/exchange", { ...req }, env),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 401]);
    const bodies = await Promise.all([a.json(), b.json()]);
    const tokens = bodies
      .map((body) => (body as { token?: string }).token)
      .filter(Boolean);
    expect(tokens).toEqual(["session-token"]);
  });
});
