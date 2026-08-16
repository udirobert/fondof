import { describe, expect, it } from "vitest";
import { parseIdeas, needUrl } from "./ingest.js";

describe("parseIdeas (LLM JSON extraction)", () => {
  it("parses a plain JSON array", () => {
    const raw = JSON.stringify([
      {
        title: "Retry Budgets",
        description: "Cap aggregate retries per request tree.",
        domain: ["reliability"],
        applicability: ["typescript"],
        patternType: "technique",
      },
      {
        title: "Typed Error Taxonomy",
        description: "Separate retryable from fatal errors.",
        domain: ["typescript"],
        applicability: ["node"],
        patternType: "architecture",
      },
    ]);
    const ideas = parseIdeas(raw, "https://example.com/a", "abc123");
    expect(ideas).toHaveLength(2);
    expect(ideas[0]!.title).toBe("Retry Budgets");
    expect(ideas[0]!.sourceUrl).toBe("https://example.com/a");
    expect(ideas[0]!.sourceHash).toBe("abc123");
    expect(ideas[0]!.id).toBeTruthy();
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const raw = 'Here you go:\n```json\n[{"title":"T","description":"D","domain":["x"],"applicability":[],"patternType":"technique"}]\n```\n';
    const ideas = parseIdeas(raw, "u", "h");
    expect(ideas).toHaveLength(1);
    expect(ideas[0]!.title).toBe("T");
  });

  it("recovers an array from prose with an embedded array", () => {
    const raw = 'Sure! [ {"title":"T2","description":"D2","domain":[],"applicability":[],"patternType":"anti-pattern"} ] hope that helps';
    const ideas = parseIdeas(raw, "u", "h");
    expect(ideas).toHaveLength(1);
    expect(ideas[0]!.patternType).toBe("anti-pattern");
  });

  it("returns [] for non-array or invalid JSON", () => {
    expect(parseIdeas('{"title":"not an array"}', "u", "h")).toEqual([]);
    expect(parseIdeas("total garbage", "u", "h")).toEqual([]);
  });

  it("drops ideas missing title or description", () => {
    const raw = JSON.stringify([
      { title: "No description" },
      { description: "No title" },
      {
        title: "Good",
        description: "D",
        domain: [],
        applicability: [],
        patternType: "technique",
      },
    ]);
    const ideas = parseIdeas(raw, "u", "h");
    expect(ideas).toHaveLength(1);
    expect(ideas[0]!.title).toBe("Good");
  });

  it("defaults patternType when missing", () => {
    const raw = JSON.stringify([
      { title: "T", description: "D", domain: [], applicability: [] },
    ]);
    const ideas = parseIdeas(raw, "u", "h");
    expect(ideas[0]!.patternType).toBe("technique");
  });
});

describe("needUrl (need-mode provenance)", () => {
  it("builds an encoded need:// pseudo-URL", () => {
    expect(needUrl("retry budgets for async fetch")).toBe(
      "need://retry%20budgets%20for%20async%20fetch",
    );
  });

  it("truncates very long needs", () => {
    const long = "a".repeat(500);
    expect(needUrl(long)).toBe(`need://${"a".repeat(96)}`);
  });
});
