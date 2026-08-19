import { describe, expect, it } from "vitest";
import { classifySkillGenres, genreBySlug } from "./skill-taxonomy.js";

describe("skill taxonomy", () => {
  it("classifies explicit reliability and stack signals", () => {
    const genres = classifySkillGenres({
      domains: ["reliability", "error-handling"],
      patternTypes: ["technique"],
      frameworks: ["Hono", "Workers"],
      languages: ["TypeScript"],
      title: "Retry budgets with jittered backoff",
    });

    expect(genres.map((genre) => genre.slug)).toContain("reliability");
    expect(genres.map((genre) => genre.slug)).toContain("developer-tools");
  });

  it("can classify a skill into more than one genre", () => {
    const genres = classifySkillGenres({
      domains: ["caching", "rendering", "ux"],
      title: "Improve frontend rendering performance",
    });

    expect(genres.map((genre) => genre.slug)).toEqual(
      expect.arrayContaining(["performance", "product-and-ux"]),
    );
  });

  it("uses a visible general-engineering fallback", () => {
    expect(classifySkillGenres({ title: "A novel practice" })).toEqual([
      {
        slug: "general-engineering",
        label: "General engineering",
        description:
          "Useful engineering practice that does not fit one narrower genre.",
      },
    ]);
  });

  it("resolves known slugs and rejects unknown ones", () => {
    expect(genreBySlug("RELIABILITY")?.label).toBe("Reliability");
    expect(genreBySlug("not-a-genre")).toBeNull();
  });
});
