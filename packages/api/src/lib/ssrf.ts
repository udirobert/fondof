/**
 * SSRF guard for user-supplied URLs.
 *
 * Cloudflare Workers already restricts egress to private ranges in most cases,
 * but we add an app-level blocklist so internal hosts and cloud metadata
 * endpoints are rejected before any fetch is attempted. This covers the
 * ingest / podcast / claim-verify paths that fetch URLs a user provides.
 */

/** Parse an IPv4 literal into its octets, or null if not a valid IPv4. */
function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = parseInt(part, 10);
    if (n > 255) return null;
    octets.push(n);
  }
  return octets;
}

function isPrivateIpv4(host: string): boolean {
  const o = parseIpv4(host);
  if (!o) return false;
  const [a, b] = o;
  // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8
  if (a === 0 || a === 10 || a === 127) return true;
  // 100.64.0.0/10 (CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 169.254.0.0/16 (link-local + cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24, 192.0.2.0/24, 192.168.0.0/16
  if (a === 192 && (b === 0 || b === 2 || b === 168)) return true;
  // 198.18.0.0/15 (benchmark), 198.51.100.0/24, 203.0.113.0/24
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0 && o[2] === 113) return true;
  // 224.0.0.0/4 multicast, 240.0.0.0/4 reserved, broadcast
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase();
  // Strip IPv6 brackets and any zone id.
  const bare = h.replace(/^\[|\]$/g, "").split("%")[0];
  if (bare === "::1" || bare === "::" || bare === "0:0:0:0:0:0:0:1") return true;
  // IPv4-mapped (::ffff:a.b.c.d) — defer to the IPv4 check.
  const mapped = bare.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  // fc00::/7 unique-local, fe80::/10 link-local
  if (/^f[cd][0-9a-f]{2}:/.test(bare)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(bare)) return true;
  return false;
}

/**
 * True when the hostname is an internal/private/metadata target that must not
 * be fetched. Accepts a hostname or IP literal (with or without brackets).
 */
export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (isPrivateIpv4(host)) return true;
  if (host.includes(":") && isPrivateIpv6(host)) return true;
  return false;
}

/**
 * Validate a user-supplied URL before fetching. Returns null when safe, or a
 * short reason string when the URL must be rejected.
 */
export function unsafeFetchReason(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "invalid URL";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "only http(s) URLs are allowed";
  }
  if (isBlockedHost(parsed.hostname)) {
    return "that host is not reachable from here";
  }
  return null;
}
