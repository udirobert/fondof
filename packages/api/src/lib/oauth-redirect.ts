/**
 * Post-login redirect allowlist.
 *
 * `new URL(redirect, frontendUrl)` treats an absolute `redirect` as a new
 * origin, so an attacker-supplied value would send the one-time exchange
 * code off-site. Only same-app relative paths are accepted.
 */

const FALLBACK = "/";
const MAX_LEN = 512;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function decodeNested(value: string): string | null {
  let current = value;
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) return current;
      current = decoded;
    } catch {
      return null;
    }
  }
  return current;
}

/**
 * Return a relative app path (`/…`) or `/` if `raw` has a scheme, authority,
 * backslash, or anything else `new URL` could resolve off-origin.
 */
export function safeAppPath(raw: string | undefined | null): string {
  if (raw == null) return FALLBACK;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_LEN) return FALLBACK;
  if (CONTROL_CHARS.test(trimmed) || trimmed.includes("\\") || /%5c/i.test(trimmed)) {
    return FALLBACK;
  }

  const decoded = decodeNested(trimmed);
  if (decoded == null) return FALLBACK;
  const value = decoded.trim();
  if (
    !value ||
    CONTROL_CHARS.test(value) ||
    value.includes("\\") ||
    value.includes("://") ||
    SCHEME.test(value) ||
    value.startsWith("//") ||
    !value.startsWith("/")
  ) {
    return FALLBACK;
  }

  return value;
}

/**
 * Build the post-login URL on a fixed frontend origin. The resulting origin
 * must match `frontendUrl` exactly; otherwise we fall back to `/`.
 */
export function postLoginUrl(
  frontendUrl: string,
  redirectRaw: string | undefined | null,
): URL {
  const base = new URL(frontendUrl);
  const path = safeAppPath(redirectRaw);
  try {
    const url = new URL(path, base);
    if (url.origin !== base.origin) {
      return new URL("/", base);
    }
    return url;
  } catch {
    return new URL("/", base);
  }
}
