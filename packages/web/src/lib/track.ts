/**
 * Product event tracking client.
 * Fire-and-forget: never blocks UI, silently swallows failures.
 */

import { API_BASE, apiFetch } from "@/lib/api-base";

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
  | "pool_draw"
  | "source_impact_shared"
  | "creator_impact_shared"
  | "agent_url_attached"
  | "agent_link_clicked";

/**
 * Track a product event. Non-blocking, fire-and-forget.
 * Auth is sent automatically via the httpOnly session cookie.
 */
export function track(
  event: EventName,
  properties?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;

  apiFetch(`${API_BASE}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties }),
  }).catch(() => {
    // Silent — analytics should never break UX
  });
}
