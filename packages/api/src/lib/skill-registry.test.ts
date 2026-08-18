import { describe, expect, it } from "vitest";
import {
  getPublicSkill,
  getSkillRecord,
  listPublicSkills,
  markSkillAttested,
  patchPublicSkill,
  recordPublicSkill,
  unlistPublicSkill,
  type PublicSkillInput,
} from "./skill-registry.js";

interface KVRecord {
  value: string;
  expiry?: number;
}

/** Minimal in-memory KVNamespace for unit tests. */
function fakeKV(): KVNamespace {
  const store = new Map<string, KVRecord>();
  return {
    get: async (key: string, type?: "text" | "json") => {
      const rec = store.get(key);
      if (!rec) return null;
      if (rec.expiry && rec.expiry < Date.now()) {
        store.delete(key);
        return null;
      }
      return type === "json" ? JSON.parse(rec.value) : rec.value;
    },
    put: async (key: string, value: string, opts?: { expirationTtl?: number }) => {
      store.set(key, {
        value,
        expiry: opts?.expirationTtl
          ? Date.now() + opts.expirationTtl * 1000
          : undefined,
      });
    },
    list: async (opts?: { prefix?: string; limit?: number }) => {
      const keys = [...store.keys()]
        .filter((k) => (opts?.prefix ? k.startsWith(opts.prefix) : true))
        .map((name) => ({
          name,
          expiration: undefined,
          metadata: undefined,
        }));
      return {
        keys: keys.slice(0, opts?.limit ?? 1000),
        list_complete: true,
        cacheStatus: undefined,
      };
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

function envWith(kv: KVNamespace) {
  return { SESSIONS: kv } as unknown as Parameters<
    typeof recordPublicSkill
  >[0];
}

const baseInput: PublicSkillInput = {
  hash: "ABC123",
  title: "Retry Budgets",
  markdown: "# Retry Budgets\n\n## Context\n…",
  repo: "myapp",
  frameworks: ["next"],
  languages: ["typescript"],
  sourceUrls: ["https://youtube.com/watch?v=abcdefghijk"],
  sourceHashes: ["deadbeef"],
  composedAt: "2026-08-19T12:00:00.000Z",
};

describe("skill-registry (durable public skills)", () => {
  it("records and reads back a public skill (hash normalized)", async () => {
    const env = envWith(fakeKV());
    await recordPublicSkill(env, baseInput);
    const rec = await getPublicSkill(env, "abc123");
    expect(rec?.hash).toBe("abc123");
    expect(rec?.title).toBe("Retry Budgets");
    expect(rec?.onChain).toBe(false);
    expect(rec?.storageVersion).toBe(2);
    expect(rec?.canonicalSources?.[0]?.id).toMatch(/^src_[0-9a-f]{32}$/);
    expect(rec?.canonicalSources?.[0]?.url).toBe(
      "https://www.youtube.com/watch?v=abcdefghijk",
    );
    expect(rec?.markdown).toContain("## Context");
  });

  it("patches public metadata without relying on the cache layer", async () => {
    const env = envWith(fakeKV());
    await recordPublicSkill(env, baseInput);
    await patchPublicSkill(env, "abc123", {
      title: "Retry Budgets Updated",
      markdown: "# Retry Budgets Updated",
    });
    const rec = await getPublicSkill(env, "abc123");
    expect(rec?.title).toBe("Retry Budgets Updated");
    expect(rec?.markdown).toBe("# Retry Budgets Updated");
    expect(rec?.storageVersion).toBe(2);
  });

  it("preserves explicit parent lineage", async () => {
    const env = envWith(fakeKV());
    await recordPublicSkill(env, {
      ...baseInput,
      hash: "child",
      derivedFromSkillHash: "0xPARENT",
    });
    expect((await getPublicSkill(env, "child"))?.derivedFromSkillHash).toBe(
      "parent",
    );
  });

  it("returns null for unknown hashes", async () => {
    const env = envWith(fakeKV());
    expect(await getPublicSkill(env, "nope")).toBeNull();
  });

  it("markSkillAttested flips onChain and stores the tx hash", async () => {
    const env = envWith(fakeKV());
    await recordPublicSkill(env, baseInput);
    expect(await markSkillAttested(env, "ABC123", "0xabc")).toBe(true);
    const rec = await getPublicSkill(env, "abc123");
    expect(rec?.onChain).toBe(true);
    expect(rec?.attestedTxHash).toBe("0xabc");
  });

  it("unlists only for the owner and removes source discovery", async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    await recordPublicSkill(env, {
      ...baseInput,
      ownerId: 42,
      ownerLogin: "ada",
    });
    await kv.put(
      "source:youtube.com",
      JSON.stringify([
        {
          skillHash: "abc123",
          title: baseInput.title,
          sourceUrl: baseInput.sourceUrls[0],
          fittedTo: baseInput.repo ?? "general",
          forgedAt: baseInput.composedAt,
        },
      ]),
    );

    expect(await unlistPublicSkill(env, "abc123", 7)).toBe("forbidden");
    expect(await getPublicSkill(env, "abc123")).not.toBeNull();
    expect(await unlistPublicSkill(env, "abc123", 42)).toBe("ok");
    expect(await getPublicSkill(env, "abc123")).toBeNull();
    expect((await getSkillRecord(env, "abc123"))?.visibility).toBe("unlisted");
    expect(await kv.get("source:youtube.com")).toBeNull();
  });

  it("cannot unlist an unowned legacy skill", async () => {
    const env = envWith(fakeKV());
    await recordPublicSkill(env, baseInput);
    expect(await unlistPublicSkill(env, "abc123", 42)).toBe("forbidden");
  });

  it("markSkillAttested is false when no record exists", async () => {
    const env = envWith(fakeKV());
    expect(await markSkillAttested(env, "ghost", "0xabc")).toBe(false);
  });

  it("re-recording preserves prior attestation", async () => {
    const env = envWith(fakeKV());
    await recordPublicSkill(env, baseInput);
    await markSkillAttested(env, "abc123", "0x1");
    await recordPublicSkill(env, {
      ...baseInput,
      title: "Retry Budgets v2",
      composedAt: "2026-08-20T12:00:00.000Z",
    });
    const rec = await getPublicSkill(env, "abc123");
    expect(rec?.onChain).toBe(true);
    expect(rec?.attestedTxHash).toBe("0x1");
    expect(rec?.title).toBe("Retry Budgets v2");
  });

  it("lists public skills newest first", async () => {
    const env = envWith(fakeKV());
    await recordPublicSkill(env, {
      ...baseInput,
      hash: "AAA",
      composedAt: "2026-08-18T00:00:00.000Z",
    });
    await recordPublicSkill(env, {
      ...baseInput,
      hash: "BBB",
      composedAt: "2026-08-21T00:00:00.000Z",
    });
    await recordPublicSkill(env, {
      ...baseInput,
      hash: "CCC",
      composedAt: "2026-08-19T00:00:00.000Z",
    });
    const list = await listPublicSkills(env, 10);
    expect(list.map((r) => r.hash)).toEqual(["bbb", "ccc", "aaa"]);
  });

  it("caps markdown and arrays", async () => {
    const env = envWith(fakeKV());
    await recordPublicSkill(env, {
      ...baseInput,
      markdown: "x".repeat(50_000),
      sourceUrls: Array.from({ length: 40 }, (_, i) => `https://x/${i}`),
      frameworks: Array.from({ length: 40 }, (_, i) => `fw-${i}`),
    });
    const rec = await getPublicSkill(env, "abc123");
    expect(rec?.markdown.length).toBe(20_000);
    expect(rec?.sourceUrls?.length).toBe(12);
    expect(rec?.frameworks?.length).toBe(8);
  });
});
