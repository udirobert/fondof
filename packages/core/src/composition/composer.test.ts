import { describe, expect, it } from "vitest";
import { sourceSegmentLabel } from "./composer.js";

describe("sourceSegmentLabel", () => {
  it("formats a first audio segment that starts at 0:00", () => {
    expect(
      sourceSegmentLabel({ startTime: 0, endTime: 12.4 }),
    ).toBe("0:00–0:12");
  });

  it("uses paragraph provenance when no audio timestamp is present", () => {
    expect(
      sourceSegmentLabel({ startParagraph: 2, endParagraph: 4 }),
    ).toBe("Paragraphs 2–4");
  });
});
