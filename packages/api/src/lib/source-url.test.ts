import { describe, expect, it } from "vitest";
import {
  canonicalPublicSourceUrl,
  canonicalSourceId,
  canonicalSources,
  normalizeSourceUrl,
  ingestCacheTtl,
} from "./source-url.js";

describe("normalizeSourceUrl (cache-key canonical form)", () => {
  it("strips tracker params and sorts the rest", () => {
    const out = normalizeSourceUrl(
      "https://blog.example.com/post?b=2&a=1&utm_source=x&fbclid=y",
    );
    expect(out).toBe("https://blog.example.com/post?a=1&b=2");
  });

  it("drops the hash fragment", () => {
    expect(
      normalizeSourceUrl("https://ex.com/a?x=1#section"),
    ).toBe("https://ex.com/a?x=1");
  });

  it("normalizes YouTube links to the canonical watch URL", () => {
    expect(
      normalizeSourceUrl("https://youtu.be/dQw4w9WgXcQ?si=tracker"),
    ).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("returns trimmed input when not a URL (graceful)", () => {
    expect(normalizeSourceUrl("  not a url  ")).toBe("not a url");
  });
});

describe("canonical source identity", () => {
  it("normalizes equivalent public URLs to one identity", async () => {
    const a = await canonicalSourceId(
      "https://youtu.be/dQw4w9WgXcQ?si=tracker",
    );
    const b = await canonicalSourceId(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(a).toBe(b);
    expect(a).toMatch(/^src_[0-9a-f]{32}$/);
  });

  it("does not assign public source identity to a stated need", async () => {
    expect(canonicalPublicSourceUrl("need://retry budgets")).toBeNull();
    expect(await canonicalSourceId("need://retry budgets")).toBeNull();
    expect((await canonicalSources(["need://retry budgets"])).length).toBe(0);
  });
});

describe("ingestCacheTtl", () => {
  it("keeps transcripts a week, articles a day", () => {
    expect(ingestCacheTtl("youtube")).toBe(60 * 60 * 24 * 7);
    expect(ingestCacheTtl("podcast")).toBe(60 * 60 * 24 * 7);
    expect(ingestCacheTtl("article")).toBe(60 * 60 * 24);
    expect(ingestCacheTtl("text")).toBe(60 * 60 * 24);
  });
});
