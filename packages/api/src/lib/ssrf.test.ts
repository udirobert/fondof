import { describe, expect, it } from "vitest";
import { isBlockedHost, unsafeFetchReason } from "./ssrf.js";

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
    expect(isBlockedHost("172.16.0.1")).toBe(true);
    expect(isBlockedHost("172.31.255.255")).toBe(true);
    expect(isBlockedHost("192.168.1.1")).toBe(true);
    expect(isBlockedHost("169.254.169.254")).toBe(true); // cloud metadata
    expect(isBlockedHost("100.64.0.1")).toBe(true); // CGNAT
    expect(isBlockedHost("0.0.0.0")).toBe(true);
  });

  it("allows public IPv4 and hostnames", () => {
    expect(isBlockedHost("8.8.8.8")).toBe(false);
    expect(isBlockedHost("172.32.0.1")).toBe(false);
    expect(isBlockedHost("example.com")).toBe(false);
    expect(isBlockedHost("www.youtube.com")).toBe(false);
  });

  it("blocks loopback and unique-local IPv6", () => {
    expect(isBlockedHost("::1")).toBe(true);
    expect(isBlockedHost("[::1]")).toBe(true);
    expect(isBlockedHost("fc00::1")).toBe(true);
    expect(isBlockedHost("fe80::1")).toBe(true);
    expect(isBlockedHost("::ffff:192.168.1.1")).toBe(true);
  });
});

describe("unsafeFetchReason", () => {
  it("rejects non-http(s) schemes", () => {
    expect(unsafeFetchReason("file:///etc/passwd")).toMatch(/http/);
    expect(unsafeFetchReason("ftp://example.com/x")).toMatch(/http/);
    expect(unsafeFetchReason("gopher://example.com")).toMatch(/http/);
  });

  it("rejects internal hosts", () => {
    expect(unsafeFetchReason("http://169.254.169.254/latest/meta-data/")).toBeTruthy();
    expect(unsafeFetchReason("http://localhost:8787/")).toBeTruthy();
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
