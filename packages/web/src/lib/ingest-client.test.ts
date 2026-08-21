import { afterEach, describe, expect, it, vi } from "vitest";

const ingestURL = vi.fn();
const ingestURLStream = vi.fn();

vi.mock("@/lib/api", () => ({
  ingestURL: (...args: unknown[]) => ingestURL(...args),
  ingestURLStream: (...args: unknown[]) => ingestURLStream(...args),
}));

import { resolveIngestStream } from "./ingest-client.js";

afterEach(() => {
  ingestURL.mockReset();
  ingestURLStream.mockReset();
});

describe("resolveIngestStream", () => {
  it("does not rerun JSON ingest after a terminal stream pipeline error", async () => {
    ingestURLStream.mockImplementation(
      async (
        _input: unknown,
        onEvent: (event: { type: string; error?: string }) => void,
      ) => {
        onEvent({ type: "error", error: "No captions available" });
      },
    );

    await expect(
      resolveIngestStream("https://youtube.com/watch?v=abcdefghijk", "content"),
    ).rejects.toThrow(/captions/i);
    expect(ingestURL).not.toHaveBeenCalled();
  });

  it("falls back to JSON ingest when the stream cannot be established", async () => {
    ingestURLStream.mockRejectedValue(new Error("HTTP 502"));
    ingestURL.mockResolvedValue({
      title: "Retry budgets",
      contentType: "article",
      sourceHash: "ab".repeat(32),
      textLength: 40,
      ideas: [
        {
          id: "1",
          title: "Retry budgets",
          description: "Cap aggregate retries.",
          domain: ["reliability"],
          applicability: ["typescript"],
          patternType: "technique",
          sourceUrl: "https://example.com/a",
          sourceHash: "ab".repeat(32),
          embedding: [],
        },
      ],
    });

    const result = await resolveIngestStream("https://example.com/a", "content");
    expect(ingestURL).toHaveBeenCalledOnce();
    expect(result.fromApi).toBe(true);
    expect(result.ideas[0]?.title).toBe("Retry budgets");
  });
});
