/**
 * Single source of truth for the API base URL.
 * Uses NEXT_PUBLIC_API_URL env var, falls back to production Worker.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fondof-api.trustfall.workers.dev";

/**
 * Cross-origin fetch that always includes the httpOnly session cookie.
 * The API is on a different origin, so `credentials: "include"` is required
 * for cookie-based auth.
 */
export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, { ...init, credentials: "include" });
}
