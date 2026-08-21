import { afterEach, describe, expect, it, vi } from "vitest";
import {
  challengeOnChain,
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
}));

const mockedChallenge = vi.mocked(challengeOnChain);
const mockedResolve = vi.mocked(resolveOnChain);

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
});
