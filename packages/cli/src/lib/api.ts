/** Hosted fondof API — override with FONDOF_API_URL. */
export function apiBase(): string {
  const raw =
    process.env.FONDOF_API_URL?.trim() ||
    "https://fondof-api.trustfall.workers.dev";
  return raw.replace(/\/$/, "");
}
