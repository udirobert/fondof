import { describe, expect, it } from "vitest";
import { compactEmbedding, cosineSimilarity } from "./embedding-compact.js";

describe("compactEmbedding", () => {
  it("returns [] for empty input", () => {
    expect(compactEmbedding([])).toEqual([]);
  });

  it("produces the requested dimension count", () => {
    const out = compactEmbedding(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(out).toHaveLength(32);
  });

  it("normalizes to unit length", () => {
    const out = compactEmbedding([1, 2, 3, 4, 5, 6, 7, 8]);
    const norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("handles inputs shorter than the target dims", () => {
    const out = compactEmbedding([1, 0]);
    expect(out.length).toBe(32);
    expect(out[0]).toBe(1);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical unit vectors", () => {
    const v = compactEmbedding([1, 2, 3]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("is 0 for incompatible vectors", () => {
    expect(cosineSimilarity([1, 2], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("is higher for similar than dissimilar vectors", () => {
    const base = compactEmbedding([1, 0, 0, 0]);
    const near = compactEmbedding([1, 0.1, 0, 0]);
    const far = compactEmbedding([0, 0, 0, 1]);
    expect(cosineSimilarity(base, near)).toBeGreaterThan(
      cosineSimilarity(base, far),
    );
  });
});
