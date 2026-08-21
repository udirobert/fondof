import { afterEach, describe, expect, it, vi } from "vitest";
import { setHostLookupForTests } from "../lib/ssrf.js";
import { sourcesRoute } from "./sources.js";

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

afterEach(() => {
  setHostLookupForTests(null);
  vi.unstubAllGlobals();
});

describe("source self-claims", () => {
  it("requires authentication and labels the claim as self-claimed", async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    await kv.put("session:token", sessionJson());

    const anonymous = await sourcesRoute.request(
      "/sources/example.com/claim",
      { method: "POST" },
      env,
    );
    expect(anonymous.status).toBe(401);

    const response = await sourcesRoute.request(
      "/sources/example.com/claim",
      { method: "POST", headers: { Authorization: "Bearer token" } },
      env,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      claim: {
        domain: "example.com",
        login: "ada",
        status: "self-claimed",
      },
    });
  });

  it("verifies control only after the nonce appears on the claimed domain", async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    await kv.put("session:token", sessionJson());

    await sourcesRoute.request(
      "/sources/example.com/claim",
      { method: "POST", headers: { Authorization: "Bearer token" } },
      env,
    );
    const challengeResponse = await sourcesRoute.request(
      "/sources/example.com/claim/challenge",
      { method: "POST", headers: { Authorization: "Bearer token" } },
      env,
    );
    const challenge = (await challengeResponse.json()) as { token: string };

    setHostLookupForTests(async () => ["93.184.216.34"]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(`<main>${challenge.token}</main>`, { status: 200 })),
    );
    const response = await sourcesRoute.request(
      "/sources/example.com/claim/verify",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ proofUrl: "https://example.com/proof" }),
      },
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      claim: {
        status: "domain-verified",
        proofUrl: "https://example.com/proof",
      },
    });
  });
});
