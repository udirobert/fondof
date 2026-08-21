/**
 * SSRF guard for user-supplied URLs.
 *
 * Static checks reject non-http(s) schemes and private/metadata literals.
 * `safeFetch` also resolves the hostname, rejects blocked destination
 * addresses, disables automatic redirects, and re-validates every hop.
 */

export const SAFE_FETCH_TIMEOUT_MS = 10_000;
export const SAFE_FETCH_MAX_BYTES = 1_000_000;
export const SAFE_FETCH_MAX_REDIRECTS = 5;

type HostLookup = (hostname: string) => Promise<string[]>;

let hostLookup: HostLookup = lookupHostAddresses;

/** Test-only: replace DNS resolution. Pass `null` to restore DoH. */
export function setHostLookupForTests(fn: HostLookup | null): void {
  hostLookup = fn ?? lookupHostAddresses;
}

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

/** Decimal, hex, or shortened IPv4 forms (`2130706433`, `127.1`). */
function coerceIpv4(host: string): number[] | null {
  const direct = parseIpv4(host);
  if (direct) return direct;
  if (/^0x[0-9a-f]+$/i.test(host)) {
    const n = Number.parseInt(host, 16);
    if (!Number.isFinite(n) || n < 0 || n > 0xffffffff) return null;
    return [
      (n >>> 24) & 255,
      (n >>> 16) & 255,
      (n >>> 8) & 255,
      n & 255,
    ];
  }
  if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (!Number.isFinite(n) || n < 0 || n > 0xffffffff) return null;
    return [
      (n >>> 24) & 255,
      (n >>> 16) & 255,
      (n >>> 8) & 255,
      n & 255,
    ];
  }
  if (!/^[\d.]+$/.test(host)) return null;
  const parts = host.split(".").map((p) => Number(p));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  if (parts.length === 2) return [parts[0], 0, 0, parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], 0, parts[2]];
  return null;
}

function isPrivateIpv4Octets(o: number[]): boolean {
  const [a, b, c] = o;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 88 && c === 99) return true;
  if (a === 192 && (b === 0 || b === 2 || b === 168)) return true;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv4(host: string): boolean {
  const o = coerceIpv4(host);
  return o ? isPrivateIpv4Octets(o) : false;
}

function parseIpv6Groups(host: string): number[] | null {
  let bare = host.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (!bare.includes(":")) return null;

  const v4tail = bare.match(/:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4tail) {
    const o = parseIpv4(v4tail[1]);
    if (!o) return null;
    const hi = ((o[0] << 8) | o[1]).toString(16);
    const lo = ((o[2] << 8) | o[3]).toString(16);
    bare = `${bare.slice(0, -v4tail[1].length)}${hi}:${lo}`;
  }

  let parts: string[];
  if (bare.includes("::")) {
    const [left, right] = bare.split("::");
    const l = left ? left.split(":").filter(Boolean) : [];
    const r = right ? right.split(":").filter(Boolean) : [];
    const miss = 8 - l.length - r.length;
    if (miss < 0) return null;
    parts = [...l, ...Array(miss).fill("0"), ...r];
  } else {
    parts = bare.split(":");
  }
  if (parts.length !== 8) return null;
  const groups: number[] = [];
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    groups.push(parseInt(part, 16));
  }
  return groups;
}

function groupsToIpv4(hi: number, lo: number): string {
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
}

function isPrivateIpv6(host: string): boolean {
  const groups = parseIpv6Groups(host);
  if (!groups) {
    const h = host.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
    const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIpv4(mapped[1]) : false;
  }
  if (groups.every((g, i) => (i === 7 ? g === 1 : g === 0))) return true;
  if (groups.every((g) => g === 0)) return true;
  if (
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff
  ) {
    return isPrivateIpv4(groupsToIpv4(groups[6], groups[7]));
  }
  if ((groups[0] & 0xfe00) === 0xfc00) return true;
  if ((groups[0] & 0xffc0) === 0xfe80) return true;
  if ((groups[0] & 0xff00) === 0xff00) return true;
  if (groups[0] === 0x2001 && groups[1] === 0xdb8) return true;
  if (
    groups[0] === 0x64 &&
    groups[1] === 0xff9b &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0
  ) {
    return isPrivateIpv4(groupsToIpv4(groups[6], groups[7]));
  }
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
  if (host.endsWith(".onion")) return true;
  if (isPrivateIpv4(host)) return true;
  if (host.includes(":") && isPrivateIpv6(host)) return true;
  return false;
}

function parseUserUrl(rawUrl: string): URL | string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "invalid URL";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "only http(s) URLs are allowed";
  }
  if (parsed.username || parsed.password) {
    return "URLs with credentials are not allowed";
  }
  if (isBlockedHost(parsed.hostname)) {
    return "that host is not reachable from here";
  }
  return parsed;
}

/**
 * Validate a user-supplied URL before fetching. Returns null when safe, or a
 * short reason string when the URL must be rejected. Does not resolve DNS —
 * use `validateFetchTarget` / `safeFetch` before connecting.
 */
export function unsafeFetchReason(rawUrl: string): string | null {
  const parsed = parseUserUrl(rawUrl);
  return typeof parsed === "string" ? parsed : null;
}

async function lookupHostAddresses(hostname: string): Promise<string[]> {
  if (coerceIpv4(hostname) || hostname.includes(":")) return [hostname];

  const ips = new Set<string>();
  for (const type of ["A", "AAAA"] as const) {
    const query = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`;
    const res = await fetch(query, {
      headers: { Accept: "application/dns-json" },
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) continue;
    const data = (await res.json()) as {
      Answer?: Array<{ type: number; data: string }>;
    };
    for (const ans of data.Answer ?? []) {
      if (ans.type === 1 || ans.type === 28) ips.add(ans.data.replace(/\.$/, ""));
      if (ans.type === 5 && isBlockedHost(ans.data.replace(/\.$/, ""))) {
        throw new Error("blocked cname");
      }
    }
  }
  return [...ips];
}

/**
 * Scheme, host, and resolved-address checks for a single hop.
 */
export async function validateFetchTarget(rawUrl: string): Promise<string | null> {
  const parsed = parseUserUrl(rawUrl);
  if (typeof parsed === "string") return parsed;

  let addresses: string[];
  try {
    addresses = await hostLookup(parsed.hostname);
  } catch {
    return "that host is not reachable from here";
  }
  if (addresses.length === 0) {
    return "that host is not reachable from here";
  }
  for (const addr of addresses) {
    if (isBlockedHost(addr) || isPrivateIpv6(addr)) {
      return "that host is not reachable from here";
    }
  }
  return null;
}

export interface SafeFetchOptions {
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  /** When set, every hop's hostname (minus a leading www.) must match. */
  sameNormalizedHost?: string;
}

export type SafeFetchResult =
  | { ok: true; status: number; url: string; body: string; headers: Headers }
  | { ok: false; reason: string };

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

async function readCappedBody(
  response: Response,
  maxBytes: number,
): Promise<string | { error: string }> {
  const declared = Number(response.headers.get("content-length") ?? "NaN");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { error: "response too large" };
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return text.length > maxBytes ? { error: "response too large" } : text;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { error: "response too large" };
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(buf);
}

/**
 * Fetch a user-supplied URL with DNS + redirect revalidation, size and time
 * limits. Automatic redirects are disabled; each Location is checked again.
 */
export async function safeFetch(
  rawUrl: string,
  opts: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const maxRedirects = opts.maxRedirects ?? SAFE_FETCH_MAX_REDIRECTS;
  const timeoutMs = opts.timeoutMs ?? SAFE_FETCH_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? SAFE_FETCH_MAX_BYTES;
  const method = opts.method ?? "GET";

  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return { ok: false, reason: "invalid URL" };
    }
    if (
      opts.sameNormalizedHost &&
      normalizeHost(parsed.hostname) !== normalizeHost(opts.sameNormalizedHost)
    ) {
      return { ok: false, reason: "redirect left the allowed host" };
    }

    const blocked = await validateFetchTarget(current);
    if (blocked) return { ok: false, reason: blocked };

    let response: Response;
    try {
      response = await fetch(current, {
        method,
        headers: opts.headers,
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return { ok: false, reason: "request failed" };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("Location");
      if (!location) return { ok: false, reason: "redirect without location" };
      current = new URL(location, current).toString();
      continue;
    }

    if (!response.ok) {
      return { ok: false, reason: `http ${response.status}` };
    }

    if (method === "HEAD") {
      return {
        ok: true,
        status: response.status,
        url: current,
        body: "",
        headers: response.headers,
      };
    }

    const body = await readCappedBody(response, maxBytes);
    if (typeof body !== "string") {
      return { ok: false, reason: body.error };
    }
    return {
      ok: true,
      status: response.status,
      url: current,
      body,
      headers: response.headers,
    };
  }

  return { ok: false, reason: "too many redirects" };
}
