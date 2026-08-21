import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DAILY_OPS,
  issueRelayerIntent,
  isResolverLogin,
  normalizeRelayerParams,
  normalizeSkillHash,
  runRelayerWrite,
  setRelayerHalt,
} from "./relayer-guard.js";

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

const session = { userId: 7, login: "ada" };
const skillHash = "ab".repeat(32);
const sourceHashes = ["cd".repeat(32)];

describe("relayer guard", () => {
  it("rejects non-hex skill hashes instead of hashing arbitrary input", async () => {
    expect(normalizeSkillHash("not-a-hash")).toBeNull();
    expect(normalizeSkillHash(skillHash)).toBe(skillHash);
    const bad = await normalizeRelayerParams("challenge", {
      skillHash: "hello world",
    });
    expect("error" in bad).toBe(true);
  });

  it("binds an intent to normalized parameters", async () => {
    const kv = fakeKV();
    const issued = await issueRelayerIntent(kv, undefined, session, "publish", {
      skillHash: `0x${skillHash}`,
      sourceHashes: [...sourceHashes].reverse(),
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.value.op).toBe("publish");
    expect(issued.value.status).toBe("issued");
  });

  it("halts all relayer writes when the emergency stop is set", async () => {
    const kv = fakeKV();
    await setRelayerHalt(kv, true);
    const result = await runRelayerWrite(
      kv,
      undefined,
      session,
      "challenge",
      { skillHash },
      async () => ({ txHash: "0x1" }),
    );
    expect(result).toMatchObject({
      ok: false,
      status: 503,
      body: { code: "relayer_halt" },
    });
  });

  it("halts from the environment flag even without a KV marker", async () => {
    const result = await runRelayerWrite(
      fakeKV(),
      "1",
      session,
      "use",
      { skillHash },
      async () => ({ txHash: "0x1" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(503);
  });

  it("rejects an intent whose parameters do not match the execute call", async () => {
    const kv = fakeKV();
    const issued = await issueRelayerIntent(kv, undefined, session, "challenge", {
      skillHash,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const other = "ef".repeat(32);
    const result = await runRelayerWrite(
      kv,
      undefined,
      session,
      "challenge",
      { skillHash: other },
      async () => ({ txHash: "0x1" }),
      issued.intentId,
    );
    expect(result).toMatchObject({
      ok: false,
      status: 409,
      body: { code: "intent_mismatch" },
    });
  });

  it("does not send a second transaction for the same digest", async () => {
    const kv = fakeKV();
    let calls = 0;
    const exec = async () => {
      calls += 1;
      return { txHash: `0x${calls}` };
    };
    const first = await runRelayerWrite(
      kv,
      undefined,
      session,
      "publish",
      { skillHash, sourceHashes },
      exec,
    );
    const second = await runRelayerWrite(
      kv,
      undefined,
      session,
      "publish",
      { skillHash, sourceHashes: [...sourceHashes] },
      exec,
    );
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(calls).toBe(1);
    expect(second.replay).toBe(true);
    expect(second.value.txHash).toBe(first.value.txHash);
  });

  it("releases reserved spend when the chain write throws", async () => {
    const kv = fakeKV();
    await expect(
      runRelayerWrite(
        kv,
        undefined,
        session,
        "challenge",
        { skillHash },
        async () => {
          throw new Error("rpc down");
        },
      ),
    ).rejects.toThrow("rpc down");

    const retry = await runRelayerWrite(
      kv,
      undefined,
      session,
      "challenge",
      { skillHash },
      async () => ({ txHash: "0xok" }),
    );
    expect(retry.ok).toBe(true);
  });

  it("enforces the per-account daily op budget", async () => {
    const kv = fakeKV();
    for (let i = 0; i < ACCOUNT_DAILY_OPS.use; i++) {
      const hash = i.toString(16).padStart(64, "0");
      const result = await runRelayerWrite(
        kv,
        undefined,
        session,
        "use",
        { skillHash: hash },
        async () => ({ txHash: `0x${i}` }),
      );
      expect(result.ok).toBe(true);
    }
    const denied = await runRelayerWrite(
      kv,
      undefined,
      session,
      "use",
      { skillHash: "aa".repeat(32) },
      async () => ({ txHash: "0xno" }),
    );
    expect(denied).toMatchObject({
      ok: false,
      status: 402,
      body: { code: "relayer_budget", scope: "account" },
    });
  });

  it("treats only allowlisted GitHub logins as resolvers", () => {
    expect(isResolverLogin("Ada", "ada, bob")).toBe(true);
    expect(isResolverLogin("eve", "ada, bob")).toBe(false);
    expect(isResolverLogin("ada", "")).toBe(false);
  });
});
