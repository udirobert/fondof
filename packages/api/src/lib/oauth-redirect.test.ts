import { describe, expect, it } from "vitest";
import { postLoginUrl, safeAppPath } from "./oauth-redirect.js";

const FRONTEND = "https://fondof.netlify.app";

describe("safeAppPath", () => {
  it("keeps in-app relative paths and query strings", () => {
    expect(safeAppPath("/")).toBe("/");
    expect(safeAppPath("/pool")).toBe("/pool");
    expect(safeAppPath("/s/abc?quick=1")).toBe("/s/abc?quick=1");
    expect(safeAppPath("  /u/ada  ")).toBe("/u/ada");
  });

  it("keeps query and hash on relative paths", () => {
    expect(safeAppPath("/?quick=1")).toBe("/?quick=1");
    expect(safeAppPath("/pool#top")).toBe("/pool#top");
  });

  it("rejects schemes, authorities, and backslashes", () => {
    expect(safeAppPath("https://evil.example/steal")).toBe("/");
    expect(safeAppPath("//evil.example/steal")).toBe("/");
    expect(safeAppPath("/\\evil.example")).toBe("/");
    expect(safeAppPath("\\/evil.example")).toBe("/");
    expect(safeAppPath("https:evil.example")).toBe("/");
    expect(safeAppPath("javascript:alert(1)")).toBe("/");
    expect(safeAppPath("http://fondof.netlify.app/pool")).toBe("/");
  });

  it("rejects encoded protocol-relative and backslash payloads", () => {
    expect(safeAppPath("%2f%2fevil.example")).toBe("/");
    expect(safeAppPath("%5cevil.example")).toBe("/");
    expect(safeAppPath("/%2f%2fevil.example")).toBe("/");
  });
});

describe("postLoginUrl", () => {
  it("resolves relative paths against the frontend origin", () => {
    const url = postLoginUrl(FRONTEND, "/pool");
    expect(url.origin).toBe("https://fondof.netlify.app");
    expect(url.pathname).toBe("/pool");
  });

  it("does not let an absolute URL override the frontend origin", () => {
    const url = postLoginUrl(FRONTEND, "https://evil.example/phish");
    expect(url.origin).toBe("https://fondof.netlify.app");
    expect(url.pathname).toBe("/");
  });

  it("does not follow protocol-relative authorities", () => {
    const url = postLoginUrl(FRONTEND, "//evil.example");
    expect(url.origin).toBe("https://fondof.netlify.app");
  });
});
