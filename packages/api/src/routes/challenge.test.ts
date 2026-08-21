import { afterEach, describe, expect, it, vi } from "vitest";
import {
  challengeOnChain,
  getChallengeFromChain,
  resolveOnChain,
} from "../lib/monad.js";
import { challengeRoute } from "./challenge.js";

vi.mock("../lib/monad.js", () => ({
  challengeOnChain: vi.fn(async () => ({
    txHash: "0xchal",
    blockNumber: 4,
    challengeId: 3,
  })),
  resolveOnChain: vi.fn(async () => ({
    txHash: "0xres",
    blockNumber: 5,
  })),
  getOpenChallengesFromChain: vi.fn(async () => []),
  getChallengeFromChain: vi.fn(async () => null),
}));

const mockedChallenge = vi.mocked(challengeOnChain);
const mockedResolve = vi.mocked(resolveOnChain);
const mockedGetChallenge = vi.mocked(getChallengeFromChain);

function openChallenge(id = 3) {
  return {
    challengeId: id,
    skillHash,
    challenger: "0x" + "aa".repeat(20),
    stake: "1000000000000000",
    resolved: false,
    challengerWon: false,
    createdAt: 1_700_000_000,
  };
}

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

function sessionJson(login = "ada", userId = 7) {
  return JSON.stringify({
    userId,
    login,
    avatarUrl: "",
    name: login,
    accessToken: "secret",
    createdAt: Date.now(),
  });
}

function envWith(kv: KVNamespace, extra: Record<string, string> = {}) {
  return {
    SESSIONS: kv,
    FONDOF_RELAYER_KEY: "0x" + "11".repeat(32),
    MONAD_RPC_URL: "http://127.0.0.1:8545",
    FONDOF_CONTRACT_ADDRESS: "0x" + "22".repeat(20),
    ...extra,
  } as never;
}

const skillHash = "ab".repeat(32);

afterEach(() => {
  mockedChallenge.mockClear();
  mockedResolve.mockClear();
  mockedGetChallenge.mockReset();
  mockedGetChallenge.mockResolvedValue(null);
});

describe("relayer-backed challenge routes", () => {
  it("does not stake relayer funds for an anonymous challenge", async () => {
    const res = await challengeRoute.request(
      "/challenge",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillHash }),
      },
      envWith(fakeKV()),
    );
    expect(res.status).toBe(401);
    expect(mockedChallenge).not.toHaveBeenCalled();
  });

  it("does not resolve with the user-operation relayer key", async () => {
    const kv = fakeKV();
    await kv.put("session:token", sessionJson("ada"));
    const res = await challengeRoute.request(
      "/challenge/3/resolve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ challengerWon: true }),
      },
      envWith(kv, { RESOLVER_LOGINS: "ada" }),
    );
    expect(res.status).toBe(503);
    expect(mockedResolve).not.toHaveBeenCalled();
  });

  it("rejects resolve from a signed-in non-resolver even if a resolver key exists", async () => {
    const kv = fakeKV();
    await kv.put("session:token", sessionJson("eve"));
    const res = await challengeRoute.request(
      "/challenge/3/resolve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ challengerWon: true }),
      },
      envWith(kv, {
        RESOLVER_LOGINS: "ada",
        FONDOF_RESOLVER_KEY: "0x" + "33".repeat(32),
      }),
    );
    expect(res.status).toBe(403);
    expect(mockedResolve).not.toHaveBeenCalled();
  });

  it("does not let an anonymous caller settle a dispute", async () => {
    const res = await challengeRoute.request(
      "/challenge/3/resolve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengerWon: true }),
      },
      envWith(fakeKV(), {
        RESOLVER_LOGINS: "ada",
        FONDOF_RESOLVER_KEY: "0x" + "33".repeat(32),
      }),
    );
    expect(res.status).toBe(401);
    expect(mockedResolve).not.toHaveBeenCalled();
  });

  it("rejects a missing outcome instead of defaulting to challenger-won", async () => {
    const kv = fakeKV();
    await kv.put("session:token", sessionJson("ada"));
    const res = await challengeRoute.request(
      "/challenge/3/resolve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({}),
      },
      envWith(kv, {
        RESOLVER_LOGINS: "ada",
        FONDOF_RESOLVER_KEY: "0x" + "33".repeat(32),
      }),
    );
    expect(res.status).toBe(400);
    expect(mockedResolve).not.toHaveBeenCalled();
  });

  it("does not resolve a challenge that is not open", async () => {
    const kv = fakeKV();
    await kv.put("session:token", sessionJson("ada"));
    mockedGetChallenge.mockResolvedValue(null);
    const res = await challengeRoute.request(
      "/challenge/3/resolve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ challengerWon: true }),
      },
      envWith(kv, {
        RESOLVER_LOGINS: "ada",
        FONDOF_RESOLVER_KEY: "0x" + "33".repeat(32),
      }),
    );
    expect(res.status).toBe(404);
    expect(mockedResolve).not.toHaveBeenCalled();
  });

  it("does not re-resolve an already settled challenge", async () => {
    const kv = fakeKV();
    await kv.put("session:token", sessionJson("ada"));
    mockedGetChallenge.mockResolvedValue({
      ...openChallenge(),
      resolved: true,
      challengerWon: true,
    });
    const res = await challengeRoute.request(
      "/challenge/3/resolve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ challengerWon: false }),
      },
      envWith(kv, {
        RESOLVER_LOGINS: "ada",
        FONDOF_RESOLVER_KEY: "0x" + "33".repeat(32),
      }),
    );
    expect(res.status).toBe(409);
    expect(mockedResolve).not.toHaveBeenCalled();
  });

  it("lets the allowlisted resolver settle an open challenge and writes an audit", async () => {
    const kv = fakeKV();
    await kv.put("session:token", sessionJson("ada"));
    mockedGetChallenge.mockResolvedValue(openChallenge());
    const res = await challengeRoute.request(
      "/challenge/3/resolve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ challengerWon: false }),
      },
      envWith(kv, {
        RESOLVER_LOGINS: "ada",
        FONDOF_RESOLVER_KEY: "0x" + "33".repeat(32),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockedResolve).toHaveBeenCalledOnce();
    expect(mockedResolve.mock.calls[0]?.[1]).toBe("0x" + "33".repeat(32));
    expect(mockedResolve.mock.calls[0]?.[4]).toBe(false);
    const audit = JSON.parse(
      (await kv.get("resolve-audit:3")) as string,
    ) as { resolverLogin: string; challengerWon: boolean; skillHash: string };
    expect(audit.resolverLogin).toBe("ada");
    expect(audit.challengerWon).toBe(false);
    expect(audit.skillHash).toBe(skillHash);
  });
});
