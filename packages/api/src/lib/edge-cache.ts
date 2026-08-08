/**
 * Edge cache via caches.default — no KV binding required.
 * Keys are synthetic Requests under https://fondof-cache.internal/
 */

const ORIGIN = "https://fondof-cache.internal";

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  try {
    const cached = await caches.default.match(cacheRequest(key));
    if (!cached) return null;
    return (await cached.json()) as T;
  } catch {
    return null;
  }
}

export async function cachePutJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  try {
    const ttl = Math.max(60, Math.floor(ttlSeconds));
    const body = JSON.stringify(value);
    const res = new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ttl}`,
      },
    });
    await caches.default.put(cacheRequest(key), res);
  } catch {
    // Non-fatal — miss next time
  }
}

export async function cacheGetText(key: string): Promise<string | null> {
  try {
    const cached = await caches.default.match(cacheRequest(key));
    if (!cached) return null;
    return cached.text();
  } catch {
    return null;
  }
}

export async function cachePutText(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  try {
    const ttl = Math.max(60, Math.floor(ttlSeconds));
    const res = new Response(value, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": `public, max-age=${ttl}`,
      },
    });
    await caches.default.put(cacheRequest(key), res);
  } catch {
    // Non-fatal
  }
}

function cacheRequest(key: string): Request {
  return new Request(`${ORIGIN}/${key}`);
}

/** SHA-256 hex of a string (Workers crypto). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
