import type { Context, Next } from "hono";
import type { Env } from "../index.js";
import {
  checkRateLimit,
  clientIp,
  rateLimitHeaders,
  type RateRoute,
} from "./rate-limit.js";

/** Attach rate-limit check for a route family. */
export function rateLimit(route: RateRoute) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = clientIp(c.req.raw);
    const result = await checkRateLimit(ip, route);
    const headers = rateLimitHeaders(result);
    for (const [k, v] of Object.entries(headers)) {
      c.header(k, v);
    }
    if (!result.ok) {
      return c.json(
        {
          error: "Rate limit exceeded — try again later.",
          route,
          limit: result.limit,
          reset: result.reset,
        },
        429,
      );
    }
    await next();
  };
}
