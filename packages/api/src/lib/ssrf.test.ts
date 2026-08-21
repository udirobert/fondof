import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isBlockedHost,
  safeFetch,
  setHostLookupForTests,
  unsafeFetchReason,
  validateFetchTarget,
} from "./ssrf.js";

afterEach(() => {
  setHostLookupForTests(null);
  vi.unstubAllGlobals();
});

describe("isBlockedHost", () => {
  it("blocks localhost and local/internal suffixes", () => {
    expect(isBlockedHost("localhost")).toBe(true);
    expect(isBlockedHost("foo.localhost")).toBe(true);
    expect(isBlockedHost("cache.internal")).toBe(true);
    expect(isBlockedHost("printer.local")).toBe(true);
  });

  it("blocks private and link-local IPv4 ranges", () => {
    expect(isBlockedHost("10.0.0.1")).toBe(true);
    expect(isBlockedHost("127.0.0.1")).toBe(true);
    expect(isBlockedHost("127.1")).toBe(true);
    expect(isBlockedHost("2130706433")).toBe(true);
    expect(isBlockedHost("172.16.0.1")).toBe(true);
    expect(isBlockedHost("172.31.255.255")).toBe(true);
    expect(isBlockedHost("192.168.1.1")).toBe(true);
    expect(isBlockedHost("169.254.169.254")).toBe(true);
    expect(isBlockedHost("100.64.0.1")).toBe(true);
    expect(isBlockedHost("0.0.0.0")).toBe(true);
    expect(isBlockedHost("224.0.0.1")).toBe(true);
    expect(isBlockedHost("255.255.255.255")).toBe(true);
  });

  it("allows public IPv4 and hostnames", () => {
    expect(isBlockedHost("8.8.8.8")).toBe(false);
    expect(isBlockedHost("172.32.0.1")).toBe(false);
    expect(isBlockedHost("example.com")).toBe(false);
    expect(isBlockedHost("www.youtube.com")).toBe(false);
  });

  it("blocks loopback, unique-local, multicast, and mapped IPv6", () => {
    expect(isBlockedHost("::1")).toBe(true);
    expect(isBlockedHost("[::1]")).toBe(true);
    expect(isBlockedHost("fc00::1")).toBe(true);
    expect(isBlockedHost("fe80::1")).toBe(true);
    expect(isBlockedHost("ff00::1")).toBe(true);
    expect(isBlockedHost("2001:db8::1")).toBe(true);
    expect(isBlockedHost("::ffff:192.168.1.1")).toBe(true);
  });
});

describe("unsafeFetchReason", () => {
  it("rejects non-http(s) schemes", () => {
    expect(unsafeFetchReason("file:///etc/passwd")).toMatch(/http/);
    expect(unsafeFetchReason("ftp://example.com/x")).toMatch(/http/);
    expect(unsafeFetchReason("gopher://example.com")).toMatch(/http/);
  });

  it("rejects internal hosts and credentialed URLs", () => {
    expect(unsafeFetchReason("http://169.254.169.254/latest/meta-data/")).toBeTruthy();
    expect(unsafeFetchReason("http://localhost:8787/")).toBeTruthy();
    expect(unsafeFetchReason("https://user:pass@example.com/x")).toBeTruthy();
  });

  it("rejects malformed URLs", () => {
    expect(unsafeFetchReason("not a url")).toBeTruthy();
  });

  it("allows normal public URLs", () => {
    expect(unsafeFetchReason("https://example.com/article")).toBeNull();
    expect(
      unsafeFetchReason("https://www.youtube.com/watch?v=abc123"),
    ).toBeNull();
  });
});

describe("validateFetchTarget / safeFetch", () => {
  it("rejects a public hostname that resolves to a loopback address", async () => {
    setHostLookupForTests(async () => ["127.0.0.1"]);
    expect(await validateFetchTarget("https://evil.example/x")).toBeTruthy();
  });

  it("does not follow a redirect onto a private address", async () => {
    setHostLookupForTests(async (host) =>
      host === "ok.example" ? ["93.184.216.34"] : ["8.8.8.8"],
    );
    const inits: RequestInit[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init) inits.push(init);
      const url = String(input);
      if (url.startsWith("https://ok.example")) {
        return new Response(null, {
          status: 302,
          headers: { Location: "http://169.254.169.254/latest/meta-data/" },
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await safeFetch("https://ok.example/article");
    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(inits[0]?.redirect).toBe("manual");
  });

  it("fetches a public destination with redirects disabled", async () => {
    setHostLookupForTests(async () => ["93.184.216.34"]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>hello world</html>", { status: 200 })),
    );
    const result = await safeFetch("https://example.com/article");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body).toContain("hello world");
  });
});
