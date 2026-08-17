import { describe, expect, it } from "vitest";
import { inferStack, parseRepoRef, resolveRepoContext } from "./repo-context.js";

describe("parseRepoRef", () => {
  it("parses owner/name", () => {
    expect(parseRepoRef("udirobert/fondof")).toEqual({
      owner: "udirobert",
      repo: "fondof",
    });
  });

  it("parses GitHub URLs (https, trailing path, .git)", () => {
    expect(parseRepoRef("https://github.com/udirobert/fondof")).toEqual({
      owner: "udirobert",
      repo: "fondof",
    });
    expect(parseRepoRef("https://github.com/udirobert/fondof.git")).toEqual({
      owner: "udirobert",
      repo: "fondof",
    });
    expect(parseRepoRef("https://github.com/udirobert/fondof/tree/main/src")).toEqual({
      owner: "udirobert",
      repo: "fondof",
    });
  });

  it("returns null for plain names", () => {
    expect(parseRepoRef("fondof")).toBeNull();
    expect(parseRepoRef("")).toBeNull();
  });
});

describe("inferStack", () => {
  it("detects frameworks + languages from deps", () => {
    const { frameworks, languages } = inferStack({
      next: "15.0.0",
      react: "19.0.0",
      tailwindcss: "4.0.0",
      typescript: "5.7.0",
    });
    expect(frameworks).toEqual(expect.arrayContaining(["next", "react", "tailwindcss"]));
    expect(languages).toContain("typescript");
    expect(languages).toContain("javascript");
  });

  it("does not false-positive on substring dep names", () => {
    const { frameworks } = inferStack({ "next-themes": "0.4.0", "next-auth": "5.0.0" });
    // next-themes/next-auth contain "next" but are separate deps, not next itself
    expect(frameworks).not.toContain("next");
  });

  it("returns empty frameworks for unknown deps", () => {
    const { frameworks } = inferStack({ lodash: "4.17.0" });
    expect(frameworks).toEqual([]);
  });
});

describe("resolveRepoContext (object + plain name forms, no network)", () => {
  it("returns undefined for undefined input", async () => {
    expect(await resolveRepoContext(undefined)).toBeUndefined();
  });

  it("normalizes object input", async () => {
    expect(
      await resolveRepoContext({
        name: "  myapp ",
        frameworks: ["next", "hyperframes"],
        languages: ["typescript"],
      }),
    ).toEqual({
      name: "myapp",
      frameworks: ["next", "hyperframes"],
      languages: ["typescript"],
    });
  });

  it("treats a plain non-ref string as a name only", async () => {
    expect(await resolveRepoContext("fondof")).toEqual({
      name: "fondof",
      frameworks: [],
      languages: [],
    });
  });

  it("ignores empty-object name", async () => {
    expect(await resolveRepoContext({ name: "  " })).toBeUndefined();
  });
});
