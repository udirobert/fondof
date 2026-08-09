/**
 * Single source of truth for the API base URL.
 * Uses NEXT_PUBLIC_API_URL env var, falls back to production Worker.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fondof-api.trustfall.workers.dev";
