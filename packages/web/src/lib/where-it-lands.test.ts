import { describe, expect, it } from "vitest";
import { whereItLands } from "@/lib/where-it-lands";

describe("whereItLands (structural landing map, honest heuristics)", () => {
  it("maps retry/async ideas on a Next.js repo to app + data-loader seams", () => {
    const hits = whereItLands({
      repoName: "udirobert/webapp",
      frameworks: ["Next.js"],
      languages: ["TypeScript"],
      ideaText: "retry budgets for async fetch with timeout",
    });
    const paths = hits.map((h) => h.path);
    expect(paths.some((p) => p.includes("app/"))).toBe(true);
    expect(paths.some((p) => p.includes("error.tsx"))).toBe(true);
    expect(paths.some((p) => p.includes("data loaders"))).toBe(true);
  });

  it("maps hono/workers repos to route middleware", () => {
    const hits = whereItLands({
      frameworks: ["Hono", "Workers"],
      ideaText: "retry budgets for upstream calls",
    });
    expect(hits.some((h) => h.path.includes("routes/"))).toBe(true);
  });

  it("maps chain ideas to wallet/contract surfaces", () => {
    const hits = whereItLands({
      frameworks: ["viem"],
      ideaText: "publish skill to monad pool via wallet",
    });
    expect(hits.some((h) => /chain|wallet|contract|monad/i.test(h.why + h.path)))
      .toBe(true);
  });

  it("falls back to generic landing hints when nothing matches", () => {
    const hits = whereItLands({ ideaText: "something unrelated" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.path.includes("module that owns"))).toBe(true);
  });
});
