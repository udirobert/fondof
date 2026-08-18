/**
 * Product event tracking client.
 * Fire-and-forget: never blocks UI, silently swallows failures.
 */

import { getToken } from "@/lib/auth";
import { API_BASE } from "@/lib/api-base";

type EventName =
  | "ingest_completed"
  | "forge_started"
  | "forge_completed"
  | "skill_copied"
  | "skill_published"
  | "skill_shared"
  | "skill_used_claimed"
  | "outcome_attached"
  | "skill_unlisted"
  | "challenge_issued"
  | "share_link_copied"
  | "pool_draw";

/**
 * Track a product event. Non-blocking, fire-and-forget.
 * Attaches auth token if present so the API can attribute to a user.
 */
export function track(
  event: EventName,
  properties?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;

  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  fetch(`${API_BASE}/api/events`, {
    method: "POST",
    headers,
    body: JSON.stringify({ event, properties }),
  }).catch(() => {
    // Silent — analytics should never break UX
  });
}
