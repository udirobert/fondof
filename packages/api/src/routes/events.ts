import { Hono } from "hono";
import type { Env } from "../index.js";
import { resolveSession } from "./auth.js";

export const eventsRoute = new Hono<{ Bindings: Env }>();

/**
 * Product event names — intentionally small set of meaningful moments.
 */
const VALID_EVENTS = [
  "ingest_completed",
  "forge_started",
  "forge_completed",
  "skill_copied",
  "skill_published",
  "skill_shared",
  "skill_used_claimed",
  "outcome_attached",
  "skill_unlisted",
  "challenge_issued",
  "share_link_copied",
  "pool_draw",
  "source_impact_shared",
  "creator_impact_shared",
] as const;

type EventName = (typeof VALID_EVENTS)[number];

interface EventPayload {
  event: EventName;
  properties?: Record<string, string | number | boolean>;
}

/**
 * POST /events — log a product event.
 * Stores in KV as a lightweight append log keyed by day.
 * Optional auth: if a session token is present, attaches userId.
 */
eventsRoute.post("/events", async (c) => {
  const body = await c.req.json<EventPayload>().catch(() => null);

  if (!body?.event || !VALID_EVENTS.includes(body.event)) {
    return c.json({ error: "Invalid event" }, 400);
  }

  const auth = c.req.header("Authorization");
  const session = await resolveSession(auth, c.env.SESSIONS);

  const entry = {
    event: body.event,
    properties: body.properties || {},
    userId: session?.userId ?? null,
    login: session?.login ?? null,
    ts: Date.now(),
  };

  // Store in KV: append to daily log
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `events:${day}`;

  // Read existing entries (capped to prevent unbounded growth)
  const existing = await c.env.SESSIONS.get(key, "json") as unknown[] | null;
  const entries = existing ? [...existing, entry] : [entry];

  // Cap at 500 events per day per KV key — roll to a new key if needed
  if (entries.length <= 500) {
    await c.env.SESSIONS.put(key, JSON.stringify(entries), {
      expirationTtl: 60 * 60 * 24 * 90, // 90 days retention
    });
  } else {
    // Overflow: store with a sequence suffix
    const overflowKey = `events:${day}:${Date.now()}`;
    await c.env.SESSIONS.put(overflowKey, JSON.stringify([entry]), {
      expirationTtl: 60 * 60 * 24 * 90,
    });
  }

  return c.json({ ok: true });
});

/**
 * GET /events/summary — simple counts for the current day (admin/debug).
 * No auth required for now — just aggregate counts, no PII.
 */
eventsRoute.get("/events/summary", async (c) => {
  const day = c.req.query("day") || new Date().toISOString().slice(0, 10);
  const key = `events:${day}`;
  const entries = (await c.env.SESSIONS.get(key, "json") as unknown[]) || [];

  const counts: Record<string, number> = {};
  for (const entry of entries as Array<{ event: string }>) {
    counts[entry.event] = (counts[entry.event] || 0) + 1;
  }

  return c.json({ day, total: entries.length, counts });
});
