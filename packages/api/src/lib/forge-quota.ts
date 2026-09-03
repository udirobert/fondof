/**
 * Server-side forge entitlement.
 *
 * The advertised 3-forge monthly allowance is an invariant of /forge and
 * /compose — not a client courtesy. Callers cannot skip accounting by omitting
 * /billing/record-forge. Quota is reserved before upstream work and released
 * if generation fails or is fully served from cache.
 */

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

function usageKey(subjectKey: string, month = billingMonth()): string {
  return `usage:${subjectKey}:${month}`;
}

function shareKey(userId: number, month = billingMonth()): string {
  return `shared:${userId}:${month}`;
}

function planKey(userId: number): string {
  return `plan:${userId}`;
}

/** Stable KV subject: signed-in user, else IP (IPv6 colons stripped). */
export function forgeSubjectKey(
  session: ForgeQuotaIdentity | null,
  ip: string,
): string {
  if (session) return String(session.userId);
  const trimmed = ip.trim() || "anon";
  return `ip:${trimmed.replace(/:/g, "_")}`;
}

async function readCount(kv: KVNamespace, key: string): Promise<number> {
  const raw = await kv.get(key);
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function inspectForgeEntitlement(
  kv: KVNamespace,
  session: ForgeQuotaIdentity | null,
  ip: string,
): Promise<ForgeEntitlement> {
  const month = billingMonth();
  const subjectKey = forgeSubjectKey(session, ip);

  if (session) {
    const planRaw = await kv.get(planKey(session.userId));
    if (planRaw === "pro") {
      return { allowed: true, remaining: null, plan: "pro", limit: null };
    }
    const hasShared = await kv.get(shareKey(session.userId, month));
    if (hasShared) {
      return { allowed: true, remaining: null, plan: "sharer", limit: null };
    }
  }

  const used = await readCount(kv, usageKey(subjectKey, month));
  const remaining = Math.max(0, FREE_FORGE_LIMIT - used);
  const plan: ForgePlan = session ? "free" : "anonymous";
  return {
    allowed: remaining > 0,
    remaining,
    plan,
    limit: FREE_FORGE_LIMIT,
  };
}

export async function reserveForgeQuota(
  kv: KVNamespace,
  session: ForgeQuotaIdentity | null,
  ip: string,
): Promise<ForgeReservation> {
  const subjectKey = forgeSubjectKey(session, ip);
  const entitlement = await inspectForgeEntitlement(kv, session, ip);

  if (entitlement.remaining === null) {
    return { allowed: true, reserved: false, entitlement, subjectKey };
  }
  if (!entitlement.allowed) {
    return { allowed: false, reserved: false, entitlement, subjectKey };
  }

  const key = usageKey(subjectKey);
  const current = await readCount(kv, key);
  if (current >= FREE_FORGE_LIMIT) {
    return {
      allowed: false,
      reserved: false,
      subjectKey,
      entitlement: {
        allowed: false,
        remaining: 0,
        plan: entitlement.plan,
        limit: FREE_FORGE_LIMIT,
      },
    };
  }

  const next = current + 1;
  await kv.put(key, String(next), { expirationTtl: USAGE_TTL_SECONDS });
  return {
    allowed: true,
    reserved: true,
    subjectKey,
    entitlement: {
      allowed: true,
      remaining: Math.max(0, FREE_FORGE_LIMIT - next),
      plan: entitlement.plan,
      limit: FREE_FORGE_LIMIT,
    },
  };
}

export async function releaseForgeQuota(
  kv: KVNamespace,
  reservation: ForgeReservation,
): Promise<void> {
  if (!reservation.reserved) return;
  const key = usageKey(reservation.subjectKey);
  const current = await readCount(kv, key);
  const next = Math.max(0, current - 1);
  if (next === 0) {
    await kv.delete(key);
    return;
  }
  await kv.put(key, String(next), { expirationTtl: USAGE_TTL_SECONDS });
}

/**
 * Reserve a forge slot, run generation, then finalize (keep) or release.
 * Fully cached responses do not consume the monthly allowance.
 */
export async function meteredGenerate<T>(
  kv: KVNamespace,
  session: ForgeQuotaIdentity | null,
  ip: string,
  generate: () => Promise<GenerateOutcome<T>>,
): Promise<MeteredGenerateResult<T>> {
  const reservation = await reserveForgeQuota(kv, session, ip);
  if (!reservation.allowed) {
    return {
      ok: false,
      status: 402,
      body: quotaExceededBody(reservation.entitlement),
    };
  }

  try {
    const outcome = await generate();
    if (outcome.kind === "reject") {
      await releaseForgeQuota(kv, reservation);
      return { ok: false, status: outcome.status, body: outcome.body };
    }
    if (outcome.cacheHit) {
      await releaseForgeQuota(kv, reservation);
    }
    return {
      ok: true,
      value: outcome.value,
      entitlement: reservation.entitlement,
    };
  } catch (err) {
    await releaseForgeQuota(kv, reservation);
    throw err;
  }
}

export function quotaExceededBody(
  entitlement: ForgeEntitlement,
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
      ? " Run `fondof login` (or send Authorization: Bearer <fondof session>), then retry."
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
