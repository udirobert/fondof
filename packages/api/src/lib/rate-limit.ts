import { cacheGetText, cachePutText } from "./edge-cache.js";

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export type RateBucket = {
  limit: number;
  windowSec: number;
};

/** Default budgets — protect paid upstream keys. */
export const RATE_BUDGETS = {
  ingest: { limit: 10, windowSec: 3600 },
  forge: { limit: 20, windowSec: 3600 },
  publish: { limit: 15, windowSec: 3600 },
  challenge: { limit: 15, windowSec: 3600 },
  resolve: { limit: 20, windowSec: 3600 },
  acquire: { limit: 60, windowSec: 3600 },
  use: { limit: 40, windowSec: 3600 },
  search: { limit: 30, windowSec: 3600 },
} as const satisfies Record<string, RateBucket>;

export type RateRoute = keyof typeof RATE_BUDGETS;

export function clientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("True-Client-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "anon"
  );
}

/**
 * Fixed-window counter in Cache API.
 * Fail-open on cache errors so demos still work.
 */
export async function checkRateLimit(
  ip: string,
  route: RateRoute,
): Promise<RateLimitResult> {
  const budget = RATE_BUDGETS[route];
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / budget.windowSec);
  const reset = (bucket + 1) * budget.windowSec;
  const key = `rl:${route}:${ip}:${bucket}`;

  try {
    const raw = await cacheGetText(key);
    const current = raw ? parseInt(raw, 10) : 0;
    if (!Number.isFinite(current) || current < 0) {
      await cachePutText(key, "1", budget.windowSec + 60);
      return {
        ok: true,
        limit: budget.limit,
        remaining: budget.limit - 1,
        reset,
      };
    }
    if (current >= budget.limit) {
      return { ok: false, limit: budget.limit, remaining: 0, reset };
    }
    await cachePutText(key, String(current + 1), budget.windowSec + 60);
    return {
      ok: true,
      limit: budget.limit,
      remaining: Math.max(0, budget.limit - current - 1),
      reset,
    };
  } catch {
    return {
      ok: true,
      limit: budget.limit,
      remaining: budget.limit,
      reset,
    };
  }
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}
