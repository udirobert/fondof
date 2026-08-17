import { describe, expect, it } from "vitest";
import {
  extractCaptionTracks,
  extractVideoId,
  isYouTubeUrl,
  parseYouTubeCaptions,
  rankCaptionTracks,
  type CaptionTrack,
} from "./youtube.js";

// Fixture: realistic captionTracks JSON as found in ytInitialPlayerResponse.
// Note the "runs" name form — a naive `\[.*?\]` regex stops at its first `]`.
const CAPTION_TRACKS_FIXTURE = [
  {
    baseUrl: "https://www.youtube.com/api/timedtext?v=abc&lang=hi&name=Hindi",
    name: { simpleText: "Hindi" },
    vssId: ".hi",
    languageCode: "hi",
    isTranslatable: true,
  },
  {
    baseUrl: "https://www.youtube.com/api/timedtext?v=abc&lang=en&kind=asr&name=English%20(auto)",
    name: { runs: [{ text: "English (auto-generated)" }] },
    vssId: "a.en",
    languageCode: "en",
    kind: "asr",
    isTranslatable: true,
  },
  {
    baseUrl: "https://www.youtube.com/api/timedtext?v=abc&lang=en&name=English",
    name: { runs: [{ text: "English" }] },
    vssId: ".en",
    languageCode: "en",
    isTranslatable: true,
  },
];

const wrapHtml = (tracksJson: string) =>
  `...{"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":${tracksJson},"audioTracks":[]}}}...`;

describe("isYouTubeUrl / extractVideoId", () => {
  it("recognises watch, shorts, youtu.be and embed URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=7wuYBfE131U")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/7wuYBfE131U")).toBe(true);
    expect(isYouTubeUrl("https://example.com/article")).toBe(false);
  });

  it("extracts the 11-char video id", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=7wuYBfE131U")).toBe("7wuYBfE131U");
    expect(extractVideoId("https://youtu.be/7wuYBfE131U?t=10")).toBe("7wuYBfE131U");
    expect(extractVideoId("https://example.com")).toBeNull();
  });
});

describe("extractCaptionTracks (bracket-matching parser)", () => {
  it("parses tracks whose name uses the runs[] form (nested arrays)", () => {
    const html = wrapHtml(JSON.stringify(CAPTION_TRACKS_FIXTURE));
    const tracks = extractCaptionTracks(html);
    expect(tracks).toHaveLength(3);
    expect(tracks.map((t) => t.languageCode)).toEqual(["hi", "en", "en"]);
  });

  it("handles unicode-escaped ampersands in baseUrl (raw page form)", () => {
    const esc = String.raw`\u0026`;
    const html = wrapHtml(`[{"baseUrl":"https://x?a=1${esc}b=2","vssId":".en","languageCode":"en"}]`);
    const parsed = extractCaptionTracks(html);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].baseUrl).toBe("https://x?a=1&b=2");
  });

  it("returns [] when no captionTracks key is present", () => {
    expect(extractCaptionTracks("<html>no captions here</html>")).toEqual([]);
  });

  it("returns [] for truncated/invalid JSON", () => {
    const html = wrapHtml('[{"baseUrl":"https://x","name":{"runs":[{"text":"En');
    expect(extractCaptionTracks(html)).toEqual([]);
  });

  it("drops tracks without a baseUrl", () => {
    const html = wrapHtml(
      JSON.stringify([{ languageCode: "en" }, { baseUrl: "https://x", languageCode: "en" }]),
    );
    expect(extractCaptionTracks(html)).toHaveLength(1);
  });
});

describe("rankCaptionTracks (en → a.en/ASR → any)", () => {
  it("prefers manual English over ASR English over other languages", () => {
    const ranked = rankCaptionTracks(CAPTION_TRACKS_FIXTURE);
    expect(ranked[0].vssId).toBe(".en"); // manual en first
    expect(ranked[1].vssId).toBe("a.en"); // ASR en second
    expect(ranked[2].vssId).toBe(".hi"); // others last
  });

  it("falls back to ASR english when no manual english exists", () => {
    const tracks: CaptionTrack[] = [
      { baseUrl: "a", languageCode: "hi", vssId: ".hi" },
      { baseUrl: "b", languageCode: "en", vssId: "a.en", kind: "asr" },
    ];
    expect(rankCaptionTracks(tracks)[0].vssId).toBe("a.en");
  });

  it("detects ASR via kind even without a vssId", () => {
    const tracks: CaptionTrack[] = [
      { baseUrl: "a", languageCode: "en", kind: "asr" },
      { baseUrl: "b", languageCode: "fr" },
    ];
    const ranked = rankCaptionTracks(tracks);
    // manual non-english (score 2) beats ASR english (score 4)? no — ASR en = 4, manual fr = 2
    expect(ranked[0].languageCode).toBe("en");
  });

  it("does not mutate the input array", () => {
    const tracks = [...CAPTION_TRACKS_FIXTURE];
    rankCaptionTracks(tracks);
    expect(tracks.map((t) => t.vssId)).toEqual([".hi", "a.en", ".en"]);
  });
});

describe("parseYouTubeCaptions (existing XML parser)", () => {
  const longLine = "This is a caption line that is comfortably over fifty characters long. ";

  it("joins <text> segments into clean prose", () => {
    const xml = `<?xml version="1.0" encoding="utf-8" ?><transcript>
      <text start="0" dur="2.1">Welcome &amp; hello</text>
      <text start="2.1" dur="3">${longLine}</text>
      <text start="5.1" dur="1">bye</text>
    </transcript>`;
    const text = parseYouTubeCaptions(xml);
    expect(text).toContain("Welcome & hello");
    expect(text).toContain("bye");
    expect(text).not.toMatch(/\s{2,}/);
  });

  it("strips inline HTML tags and decodes entities", () => {
    const xml = `<transcript><text start="0">&lt;b&gt;bold&lt;/b&gt; &#39;quoted&#39; ${longLine}</text></transcript>`;
    expect(parseYouTubeCaptions(xml)).toContain("bold 'quoted'");
  });

  it("returns null for empty or tiny transcripts", () => {
    expect(parseYouTubeCaptions("<transcript></transcript>")).toBeNull();
    expect(parseYouTubeCaptions("<transcript><text>hi</text></transcript>")).toBeNull();
  });
});
