import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSkillEvidence,
  recordClaimedUse,
  summarizeEvidence,
  recordOutcome,
  verifyLinkedPr,
} from "./skill-evidence.js";

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
  } as unknown as KVNamespace;
}

function envWith(kv: KVNamespace) {
  return { SESSIONS: kv } as never;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("skill evidence", () => {
  it("records claimed uses without calling them verified impact", async () => {
    const env = envWith(fakeKV());
    await recordClaimedUse(env, "0xABC");
    const evidence = await recordClaimedUse(env, "abc");

    expect(evidence.evidence.skillHash).toBe("abc");
    expect(evidence.evidence.claimedUseCount).toBe(2);
    expect(evidence.evidence.level).toBe("claimed-use");
  });

  it("summarizes evidence without calling it causal impact", () => {
    const summary = summarizeEvidence({
      skillHash: "skill",
      claimedUseCount: 2,
      claimAttemptCount: 3,
      outcome: {
        note: "A real outcome",
        prUrl: "https://github.com/acme/app/pull/1",
        prStatus: "github-confirmed",
        githubMerged: true,
        attachedAt: "2026-08-19T00:00:00.000Z",
      },
      level: "verified-pr",
      updatedAt: "2026-08-19T00:00:00.000Z",
    });

    expect(summary).toEqual({
      claimedUseCount: 2,
      outcomeCount: 1,
      linkedPrCount: 1,
      githubConfirmedPrCount: 1,
      mergedPrCount: 1,
      evidenceScore: 12,
    });
  });

  it("deduplicates repeated consented actor receipts", async () => {
    const env = envWith(fakeKV());
    const first = await recordClaimedUse(env, "skill", "user:42");
    const second = await recordClaimedUse(env, "skill", "user:42");

    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(second.tracking).toBe("account");
    expect(second.evidence.claimedUseCount).toBe(1);
    expect(second.evidence.claimAttemptCount).toBe(2);
  });

  it("keeps browser receipt identity opaque and counts distinct browsers once", async () => {
    const env = envWith(fakeKV());
    await recordClaimedUse(env, "skill", "browser:one");
    const second = await recordClaimedUse(env, "skill", "browser:one");
    const third = await recordClaimedUse(env, "skill", "browser:two");

    expect(second.deduplicated).toBe(true);
    expect(third.evidence.claimedUseCount).toBe(2);
    expect(third.tracking).toBe("browser-consent");
  });

  it("promotes an outcome with a linked PR to linked-pr, still unverified", async () => {
    const env = envWith(fakeKV());
    const evidence = await recordOutcome(env, "skill", {
      note: "Reduced duplicate retry work in the request path.",
      prUrl: "https://github.com/acme/app/pull/12",
    });

    expect(evidence.level).toBe("linked-pr");
    expect(evidence.outcome?.prStatus).toBe("unverified");
    expect(evidence.outcome?.prUrl).toContain("/pull/12");
  });

  it("confirms a GitHub PR without claiming the skill caused it", async () => {
    const env = envWith(fakeKV());
    await recordOutcome(env, "skill", {
      note: "Reduced duplicate retry work in the request path.",
      prUrl: "https://github.com/acme/app/pull/12",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            html_url: "https://github.com/acme/app/pull/12",
            title: "Improve retries",
            state: "closed",
            merged_at: "2026-08-19T00:00:00Z",
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await verifyLinkedPr(env, "skill");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evidence.level).toBe("verified-pr");
      expect(result.evidence.outcome?.prStatus).toBe("github-confirmed");
      expect(result.evidence.outcome?.githubMerged).toBe(true);
    }
  });

  it("keeps claimed use when an outcome is attached and rejects unsafe URLs", async () => {
    const env = envWith(fakeKV());
    await recordClaimedUse(env, "skill");
    const evidence = await recordOutcome(env, "skill", {
      note: "The change made the agent output more consistent.",
      prUrl: "javascript:alert(1)",
      screenshotUrl: "not a url",
    });

    expect(evidence.claimedUseCount).toBe(1);
    expect(evidence.level).toBe("outcome-attached");
    expect(evidence.outcome?.prUrl).toBeUndefined();
    expect(evidence.outcome?.screenshotUrl).toBeUndefined();
    expect((await getSkillEvidence(env, "0xskill"))?.outcome?.note).toContain(
      "more consistent",
    );
  });
});
