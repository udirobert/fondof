import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.mock("./edge-cache.js", () => ({
  cacheGetJson: vi.fn(
    async <T,>(key: string): Promise<T | null> => {
      const raw = store.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
  ),
  cachePutJson: vi.fn(
    async (key: string, value: unknown, _ttl?: number): Promise<void> => {
      store.set(key, JSON.stringify(value));
    },
  ),
}));

import { mergeSkillMeta, putSkillMeta } from "./skill-meta.js";

beforeEach(() => {
  store.clear();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("putSkillMeta (edge skill artifact)", () => {
  it("stores title and caps markdown", async () => {
    const md = "# T\n\n" + "x".repeat(20_000);
    const record = await putSkillMeta("abc123", { title: "My Skill", markdown: md });
    expect(record.title).toBe("My Skill");
    expect(record.markdown!.length).toBeLessThanOrEqual(12_000);
  });

  it("keeps omitted fields from a prior record", async () => {
    await putSkillMeta("h1", {
      title: "First",
      blurb: "b",
      repo: "me/repo",
      outcome: { note: "Cut hero CLS on the landing page." },
    });
    // Later outcome-only re-attach must not wipe title/repo
    const record = await putSkillMeta("h1", {
      outcome: { note: "Now with PR link", prUrl: "https://github.com/me/repo/pull/1" },
    });
    expect(record.title).toBe("First");
    expect(record.repo).toBe("me/repo");
    expect(record.outcome?.note).toBe("Now with PR link");
    expect(record.outcome?.prUrl).toBe("https://github.com/me/repo/pull/1");
  });

  it("drops outcomes with notes shorter than 8 chars", async () => {
    const record = await putSkillMeta("h2", {
      title: "T",
      outcome: { note: "short" },
    });
    expect(record.outcome).toBeUndefined();
  });

  it("sanitizes outcome URLs to http(s) only", async () => {
    const record = await putSkillMeta("h3", {
      title: "T",
      outcome: {
        note: "A real outcome note",
        prUrl: "javascript:alert(1)",
        screenshotUrl: "https://img.example.com/s.png",
      },
    });
    expect(record.outcome?.prUrl).toBeUndefined();
    expect(record.outcome?.screenshotUrl).toBe("https://img.example.com/s.png");
  });

  it("explicit null clears an existing outcome", async () => {
    await putSkillMeta("h4", {
      title: "T",
      outcome: { note: "An outcome note here" },
    });
    const cleared = await putSkillMeta("h4", { outcome: null });
    expect(cleared.outcome).toBeUndefined();
  });

  it("merges meta onto chain skill records", async () => {
    await putSkillMeta("h5", {
      title: "Merged",
      markdown: "# Merged\n\n## Guidance\nbody",
      frameworks: ["hono"],
    });
    const skill = { skillHash: "h5", signal: "123" } as Record<string, unknown>;
    const merged = await mergeSkillMeta(skill, { includeBody: true });
    expect(merged.title).toBe("Merged");
    expect(merged.markdown).toContain("## Guidance");
    expect(merged.signal).toBe("123");
  });
});
