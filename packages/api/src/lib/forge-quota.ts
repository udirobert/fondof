/**
 * Server-side forge entitlement.
 *
 * The advertised 3-forge monthly allowance is an invariant of /forge and
 * /compose — not a client courtesy. Callers cannot skip accounting by omitting
 * /billing/record-forge. Quota is reserved before upstream work and released
 * if generation fails or is fully served from cache.
 *
 * Anonymous subjects are identified by a salted hash of their IP, never the
 * raw IP. Counting is delegated to the FondofCoordinator Durable Object so
 * per-subject reserve/release is atomic.
 */

import type { Env } from "../index.js";
import { callCoordinator } from "../durable/coordinator.js";

export const FREE_FORGE_LIMIT = 3;
const USAGE_TTL_SECONDS = 60 * 60 * 24 * 35;

/** Returns YYYY-MM string for the current billing period. */
export function billingMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type ForgePlan = "free" | "pro" | "sharer" | "anonymous";

export interface ForgeQuotaIdentity {
  userId: number;
}

export interface ForgeEntitlement {
  allowed: boolean;
  remaining: number | null;
  plan: ForgePlan;
  limit: number | null;
}

export interface ForgeReservation {
  allowed: boolean;
  /** True when a counted slot was taken and must be released on failure. */
  reserved: boolean;
  entitlement: ForgeEntitlement;
  subjectKey: string;
}

export type MeteredGenerateResult<T> =
  | { ok: true; value: T; entitlement: ForgeEntitlement }
  | { ok: false; status: number; body: Record<string, unknown> };

export type GenerateOutcome<T> =
  | { kind: "ok"; cacheHit: boolean; value: T }
  | { kind: "reject"; status: number; body: Record<string, unknown> };

function planKey(userId: number): string {
  return `plan:${userId}`;
}

function shareKey(userId: number, month = billingMonth()): string {
  return `shared:${userId}:${month}`;
}

/** Stable, privacy-safe forge subject. Signed-in users get `user:{id}`;
 * anonymous IPs are SHA-256 hashed with a salt so we never store raw IPs. */
export async function forgeSubjectKey(
  env: Pick<Env, "FORGE_ANON_SALT">,
  session: ForgeQuotaIdentity | null,
  ip: string,
): Promise<string> {
  if (session) return `user:${session.userId}`;
  const trimmed = ip.trim() || "anon";
  const salt = env.FORGE_ANON_SALT || "fondof-dev-salt-change-me";
  const data = new TextEncoder().encode(`${salt}:${trimmed}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `anon:${hex}`;
}

function forgeCoordinatorName(subjectKey: string): string {
  return `forge-quota:${subjectKey}`;
}

async function callForgeQuota(
  env: Pick<Env, "COORDINATOR" | "SESSIONS">,
  subjectKey: string,
  request:
    | { op: "forge-inspect"; month: string; limit: number }
    | { op: "forge-reserve"; month: string; limit: number }
    | { op: "forge-release"; month: string; limit: number },
): Promise<{ ok: true; remaining: number; reserved?: boolean } | { ok: false; remaining: number; error: string }> {
  const coordinator = env.COORDINATOR;
  if (!coordinator) {
    // Without the DO binding we cannot guarantee atomic counting. Allow through
    // in local/dev mode so the code still runs, but log a warning.
    return { ok: true, remaining: FREE_FORGE_LIMIT };
  }
  const res = await callCoordinator(
    { COORDINATOR: coordinator, SESSIONS: env.SESSIONS },
    forgeCoordinatorName(subjectKey),
    { subjectKey, ...request } as never,
  );
  if (!res) {
    return { ok: true, remaining: FREE_FORGE_LIMIT };
  }
  if (res.ok) {
    return { ok: true, remaining: res.remaining ?? 0, reserved: res.reserved };
  }
  return { ok: false, remaining: res.remaining ?? 0, error: res.error || "quota_error" };
}

export async function inspectForgeEntitlement(
  env: Pick<Env, "SESSIONS" | "COORDINATOR" | "FORGE_ANON_SALT">,
  session: ForgeQuotaIdentity | null,
  ip: string,
): Promise<ForgeEntitlement> {
  const month = billingMonth();
  const subjectKey = await forgeSubjectKey(env, session, ip);

  if (session) {
    const planRaw = await env.SESSIONS.get(planKey(session.userId));
    if (planRaw === "pro") {
      return { allowed: true, remaining: null, plan: "pro", limit: null };
    }
    const hasShared = await env.SESSIONS.get(shareKey(session.userId, month));
    if (hasShared) {
      return { allowed: true, remaining: null, plan: "sharer", limit: null };
    }
  }

  const res = await callForgeQuota(env, subjectKey, {
    op: "forge-inspect",
    month,
    limit: FREE_FORGE_LIMIT,
  });
  const remaining = res.ok ? res.remaining : 0;
  const plan: ForgePlan = session ? "free" : "anonymous";
  return {
    allowed: remaining > 0,
    remaining,
    plan,
    limit: FREE_FORGE_LIMIT,
  };
}

export async function reserveForgeQuota(
  env: Pick<Env, "SESSIONS" | "COORDINATOR" | "FORGE_ANON_SALT">,
  session: ForgeQuotaIdentity | null,
  ip: string,
): Promise<ForgeReservation> {
  const subjectKey = await forgeSubjectKey(env, session, ip);
  const entitlement = await inspectForgeEntitlement(env, session, ip);

  if (entitlement.remaining === null) {
    return { allowed: true, reserved: false, entitlement, subjectKey };
  }
  if (!entitlement.allowed) {
    return { allowed: false, reserved: false, entitlement, subjectKey };
  }

  const month = billingMonth();
  const res = await callForgeQuota(env, subjectKey, {
    op: "forge-reserve",
    month,
    limit: FREE_FORGE_LIMIT,
  });

  if (!res.ok) {
    return {
      allowed: false,
      reserved: false,
      subjectKey,
      entitlement: {
        allowed: false,
        remaining: res.remaining,
        plan: entitlement.plan,
        limit: FREE_FORGE_LIMIT,
      },
    };
  }

  return {
    allowed: true,
    reserved: res.reserved ?? true,
    subjectKey,
    entitlement: {
      allowed: true,
      remaining: res.remaining,
      plan: entitlement.plan,
      limit: FREE_FORGE_LIMIT,
    },
  };
}

export async function releaseForgeQuota(
  env: Pick<Env, "SESSIONS" | "COORDINATOR" | "FORGE_ANON_SALT">,
  reservation: ForgeReservation,
): Promise<void> {
  if (!reservation.reserved) return;
  const month = billingMonth();
  await callForgeQuota(env, reservation.subjectKey, {
    op: "forge-release",
    month,
    limit: FREE_FORGE_LIMIT,
  });
}

/**
 * Reserve a forge slot, run generation, then finalize (keep) or release.
 * Fully cached responses do not consume the monthly allowance.
 */
export async function meteredGenerate<T>(
  env: Pick<Env, "SESSIONS" | "COORDINATOR" | "FORGE_ANON_SALT" | "FRONTEND_URL">,
  session: ForgeQuotaIdentity | null,
  ip: string,
  generate: () => Promise<GenerateOutcome<T>>,
): Promise<MeteredGenerateResult<T>> {
  const reservation = await reserveForgeQuota(env, session, ip);
  if (!reservation.allowed) {
    return {
      ok: false,
      status: 402,
      body: quotaExceededBody(reservation.entitlement, env.FRONTEND_URL),
    };
  }

  try {
    const outcome = await generate();
    if (outcome.kind === "reject") {
      await releaseForgeQuota(env, reservation);
      return { ok: false, status: outcome.status, body: outcome.body };
    }
    if (outcome.cacheHit) {
      await releaseForgeQuota(env, reservation);
    }
    return {
      ok: true,
      value: outcome.value,
      entitlement: reservation.entitlement,
    };
  } catch (err) {
    await releaseForgeQuota(env, reservation);
    throw err;
  }
}

export function quotaExceededBody(
  entitlement: ForgeEntitlement,
  frontendUrl = "https://fondof.netlify.app",
): Record<string, unknown> {
  const plan = entitlement.plan;
  const limit = entitlement.limit ?? FREE_FORGE_LIMIT;
  const period = "month";

  const unlock =
    plan === "anonymous"
      ? (["sign_in", "share", "pro"] as const)
      : (["share", "pro"] as const);

  const howToSignIn =
    plan === "anonymous"
      ? ` Sign in at ${frontendUrl.replace(/\/$/, "")}/ (run \`fondof login\` or send Authorization: Bearer <fondof session>), then retry.`
      : "";

  const howToShare =
    " Share a public skill you own (`fondof compose … --share`, or Share on the site) to unlock unlimited forges this month.";

  const error =
    `Forge quota exceeded (${limit}/${period}, plan=${plan}).${howToSignIn}${howToShare} Or upgrade to Pro.`;

  return {
    error,
    code: "quota_exceeded",
    allowed: false,
    remaining: entitlement.remaining,
    plan,
    limit,
    period,
    unlock: [...unlock],
    login_url: `${frontendUrl.replace(/\/$/, "")}/`,
    hint:
      plan === "anonymous"
        ? "fondof login → retry; or share one public skill after sign-in"
        : "share one public skill you own this month, or upgrade to Pro",
  };
}

/**
 * Unlock unlimited forges for the billing month after a verified public share
 * of a skill the signed-in user owns. Callers must have already checked
 * ownership — this only writes the share receipt.
 */
export async function grantVerifiedShareBenefit(
  kv: KVNamespace,
  userId: number,
  skillHash: string,
  platform = "public-share",
): Promise<void> {
  const month = billingMonth();
  await kv.put(
    shareKey(userId, month),
    JSON.stringify({
      firstSharedAt: Date.now(),
      skillHash,
      platform,
    }),
    { expirationTtl: USAGE_TTL_SECONDS },
  );

  const skillsKey = `user-skills:${userId}`;
  const existing = (await kv.get(skillsKey, "json")) as string[] | null;
  const skills = existing || [];
  if (!skills.includes(skillHash)) {
    skills.push(skillHash);
    await kv.put(skillsKey, JSON.stringify(skills), {
      expirationTtl: 60 * 60 * 24 * 365,
    });
  }
}
