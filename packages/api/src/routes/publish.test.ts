import { afterEach, describe, expect, it, vi } from "vitest";
import { forgeOnChain } from "../lib/monad.js";
import { publishRoute } from "./publish.js";

vi.mock("../lib/monad.js", () => ({
  forgeOnChain: vi.fn(async () => ({
    txHash: "0xabc",
    blockNumber: 11,
  })),
}));

const mockedForge = vi.mocked(forgeOnChain);

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
    FONDOF_RELAYER_KEY: "0x" + "11".repeat(32),
    MONAD_RPC_URL: "http://127.0.0.1:8545",
    FONDOF_CONTRACT_ADDRESS: "0x" + "22".repeat(20),
  } as never;
}

const skillHash = "ab".repeat(32);
const sourceHashes = ["cd".repeat(32)];

afterEach(() => {
  mockedForge.mockClear();
});

describe("POST /publish relayer gate", () => {
  it("does not sign a forge for an anonymous caller", async () => {
    const res = await publishRoute.request(
      "/publish",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillHash, sourceHashes }),
      },
      envWith(fakeKV()),
    );
    expect(res.status).toBe(401);
    expect(mockedForge).not.toHaveBeenCalled();
  });

  it("does not spend relayer funds on a skill the caller does not own", async () => {
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
    await kv.put(
      `pub-skill:${skillHash}`,
      JSON.stringify({
        hash: skillHash,
        title: "Owned by someone else",
        markdown: "# x",
        sourceUrls: [],
        sourceHashes,
        composedAt: new Date().toISOString(),
        visibility: "public",
        ownerId: 99,
        onChain: false,
      }),
    );

    const res = await publishRoute.request(
      "/publish",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ skillHash, sourceHashes }),
      },
      envWith(kv),
    );
    expect(res.status).toBe(403);
    expect(mockedForge).not.toHaveBeenCalled();
  });

  it("sponsors an owned skill once and replays the receipt", async () => {
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
    await kv.put(
      `pub-skill:${skillHash}`,
      JSON.stringify({
        hash: skillHash,
        title: "Mine",
        markdown: "# x",
        sourceUrls: [],
        sourceHashes,
        composedAt: new Date().toISOString(),
        visibility: "public",
        ownerId: 7,
        onChain: false,
      }),
    );

    const env = envWith(kv);
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    };
    const body = JSON.stringify({ skillHash, sourceHashes });
    const first = await publishRoute.request(
      "/publish",
      { method: "POST", headers, body },
      env,
    );
    const second = await publishRoute.request(
      "/publish",
      { method: "POST", headers, body },
      env,
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mockedForge).toHaveBeenCalledTimes(1);
    expect(await second.json()).toMatchObject({
      txHash: "0xabc",
      replay: true,
    });
  });
});
