/**
 * Relayer spend gate.
 *
 * Every chain write that uses the service wallet must pass through here:
 * authenticated caller, server-issued intent bound to normalized params,
 * per-account + global daily budgets, a transaction-value ceiling, and an
 * emergency stop. KV errors fail closed (deny) so a cache/rate-limit outage
 * cannot become a drain.
 */

import { sha256Hex } from "./edge-cache.js";

/** 0.001 native — matches SkillPool forge/challenge backing. */
export const RELAYER_TX_VALUE_WEI = 1_000_000_000_000_000n;
export const RELAYER_MAX_TX_VALUE_WEI = RELAYER_TX_VALUE_WEI;

export const ACCOUNT_DAILY_SPEND_WEI = RELAYER_TX_VALUE_WEI * 6n;
export const GLOBAL_DAILY_SPEND_WEI = RELAYER_TX_VALUE_WEI * 30n;

export const ACCOUNT_DAILY_OPS: Record<RelayerOp, number> = {
  publish: 3,
  challenge: 3,
  use: 10,
  storm: 1,
  resolve: 20,
};

export const GLOBAL_DAILY_OPS: Record<RelayerOp, number> = {
  publish: 30,
  challenge: 30,
  use: 80,
  storm: 6,
  resolve: 50,
};

export const STORM_MAX_TXS = 8;
const INTENT_TTL_MS = 120_000;
const LEDGER_TTL_SECONDS = 60 * 60 * 48;
const IDEMP_TTL_SECONDS = 60 * 60 * 24 * 7;
const HALT_KEY = "relayer:halt";

export type RelayerOp = "publish" | "challenge" | "use" | "storm" | "resolve";

export interface RelayerSession {
  userId: number;
  login: string;
}

export interface RelayerWriteParams {
  skillHash?: string;
  sourceHashes?: string[];
  challengeId?: number;
  challengerWon?: boolean;
  count?: number;
}

export interface RelayerIntent {
  id: string;
  userId: number;
  op: RelayerOp;
  paramsDigest: string;
  valueWei: string;
  createdAt: number;
  expiresAt: number;
  status: "issued" | "consumed";
  result?: Record<string, unknown>;
}

export interface RelayerLedger {
  valueWei: string;
  ops: Partial<Record<RelayerOp, number>>;
}

export type RelayerWriteResult<T> =
  | { ok: true; value: T; intentId: string; replay: boolean }
  | { ok: false; status: number; body: Record<string, unknown> };

interface NormalizedOp {
  digest: string;
  valueWei: bigint;
  skillHash?: string;
  sourceHashes?: string[];
  challengeId?: number;
  challengerWon?: boolean;
  count?: number;
}

export function utcDay(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function parseResolverLogins(raw?: string): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isResolverLogin(login: string, raw?: string): boolean {
  return parseResolverLogins(raw).has(login.toLowerCase());
}

export function assertTxValueCeiling(valueWei: bigint): void {
  if (valueWei > RELAYER_MAX_TX_VALUE_WEI) {
    throw new Error("Relayer transaction value exceeds ceiling");
  }
}

export function normalizeSkillHash(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{16,64}$/.test(clean)) return null;
  return clean.padStart(64, "0");
}

function generateIntentId(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function costWei(op: RelayerOp): bigint {
  return op === "publish" || op === "challenge" ? RELAYER_TX_VALUE_WEI : 0n;
}

export async function normalizeRelayerParams(
  op: RelayerOp,
  params: RelayerWriteParams,
): Promise<NormalizedOp | { error: string }> {
  if (op === "resolve") {
    const id = params.challengeId;
    if (id == null || !Number.isInteger(id) || id < 0) {
      return { error: "challengeId is required" };
    }
    const challengerWon = params.challengerWon !== false;
    const digest = await sha256Hex(`resolve:${id}:${challengerWon ? "1" : "0"}`);
    return { digest, valueWei: 0n, challengeId: id, challengerWon };
  }

  const skillHash = params.skillHash
    ? normalizeSkillHash(params.skillHash)
    : null;
  if (!skillHash) return { error: "skillHash must be a hex id" };

  if (op === "publish") {
    const sources = (params.sourceHashes ?? [])
      .map(normalizeSkillHash)
      .filter((h): h is string => !!h)
      .sort();
    if (sources.length === 0) return { error: "sourceHashes are required" };
    const digest = await sha256Hex(`publish:${skillHash}:${sources.join(",")}`);
    return {
      digest,
      valueWei: RELAYER_TX_VALUE_WEI,
      skillHash,
      sourceHashes: sources,
    };
  }

  if (op === "challenge" || op === "use") {
    const digest = await sha256Hex(`${op}:${skillHash}`);
    return {
      digest,
      valueWei: costWei(op),
      skillHash,
    };
  }

  const count = Math.min(
    STORM_MAX_TXS,
    Math.max(2, Math.floor(params.count ?? 8)),
  );
  const digest = await sha256Hex(`storm:${skillHash}:${count}`);
  return { digest, valueWei: 0n, skillHash, count };
}

export async function isRelayerHalted(
  kv: KVNamespace,
  haltEnv?: string,
): Promise<boolean> {
  if (haltEnv === "1" || haltEnv === "true") return true;
  try {
    const flag = await kv.get(HALT_KEY);
    return flag === "1" || flag === "true";
  } catch {
    return true;
  }
}

export async function setRelayerHalt(
  kv: KVNamespace,
  halted: boolean,
): Promise<void> {
  if (halted) {
    await kv.put(HALT_KEY, "1");
    return;
  }
  await kv.delete(HALT_KEY);
}

async function readLedger(
  kv: KVNamespace,
  key: string,
): Promise<RelayerLedger> {
  const raw = (await kv.get(key, "json")) as RelayerLedger | null;
  if (!raw || typeof raw.valueWei !== "string") {
    return { valueWei: "0", ops: {} };
  }
  return { valueWei: raw.valueWei, ops: raw.ops ?? {} };
}

async function writeLedger(
  kv: KVNamespace,
  key: string,
  ledger: RelayerLedger,
): Promise<void> {
  await kv.put(key, JSON.stringify(ledger), {
    expirationTtl: LEDGER_TTL_SECONDS,
  });
}

function userLedgerKey(userId: number, day: string): string {
  return `relayer-ledger:user:${userId}:${day}`;
}
function globalLedgerKey(day: string): string {
  return `relayer-ledger:global:${day}`;
}
function intentKey(id: string): string {
  return `relayer-intent:${id}`;
}
function idempKey(userId: number, op: RelayerOp, digest: string): string {
  return `relayer-idemp:${userId}:${op}:${digest}`;
}

function budgetDenied(
  op: RelayerOp,
  scope: "account" | "global",
): { ok: false; status: number; body: Record<string, unknown> } {
  return {
    ok: false,
    status: 402,
    body: {
      error: `Relayer ${scope} spend budget exceeded for ${op}`,
      code: "relayer_budget",
      op,
      scope,
    },
  };
}

function wouldExceed(
  ledger: RelayerLedger,
  op: RelayerOp,
  valueWei: bigint,
  capValue: bigint,
  capOps: number,
): boolean {
  const usedValue = BigInt(ledger.valueWei || "0");
  const usedOps = ledger.ops[op] ?? 0;
  return usedValue + valueWei > capValue || usedOps + 1 > capOps;
}

async function reserveSpend(
  kv: KVNamespace,
  userId: number,
  op: RelayerOp,
  valueWei: bigint,
): Promise<
  | { ok: true; day: string }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const day = utcDay();
  const userKey = userLedgerKey(userId, day);
  const globalKey = globalLedgerKey(day);
  const user = await readLedger(kv, userKey);
  const global = await readLedger(kv, globalKey);

  if (
    wouldExceed(
      user,
      op,
      valueWei,
      ACCOUNT_DAILY_SPEND_WEI,
      ACCOUNT_DAILY_OPS[op],
    )
  ) {
    return budgetDenied(op, "account");
  }
  if (
    wouldExceed(
      global,
      op,
      valueWei,
      GLOBAL_DAILY_SPEND_WEI,
      GLOBAL_DAILY_OPS[op],
    )
  ) {
    return budgetDenied(op, "global");
  }

  user.ops[op] = (user.ops[op] ?? 0) + 1;
  user.valueWei = (BigInt(user.valueWei) + valueWei).toString();
  global.ops[op] = (global.ops[op] ?? 0) + 1;
  global.valueWei = (BigInt(global.valueWei) + valueWei).toString();
  await writeLedger(kv, userKey, user);
  await writeLedger(kv, globalKey, global);
  return { ok: true, day };
}

async function releaseSpend(
  kv: KVNamespace,
  userId: number,
  op: RelayerOp,
  valueWei: bigint,
  day: string,
): Promise<void> {
  const userKey = userLedgerKey(userId, day);
  const globalKey = globalLedgerKey(day);
  const user = await readLedger(kv, userKey);
  const global = await readLedger(kv, globalKey);
  user.ops[op] = Math.max(0, (user.ops[op] ?? 0) - 1);
  user.valueWei = (BigInt(user.valueWei) - valueWei < 0n
    ? 0n
    : BigInt(user.valueWei) - valueWei
  ).toString();
  global.ops[op] = Math.max(0, (global.ops[op] ?? 0) - 1);
  global.valueWei = (BigInt(global.valueWei) - valueWei < 0n
    ? 0n
    : BigInt(global.valueWei) - valueWei
  ).toString();
  await writeLedger(kv, userKey, user);
  await writeLedger(kv, globalKey, global);
}

export async function inspectRelayerBudget(
  kv: KVNamespace,
  userId: number,
): Promise<{
  day: string;
  account: RelayerLedger;
  global: RelayerLedger;
  halted: boolean;
}> {
  const day = utcDay();
  return {
    day,
    account: await readLedger(kv, userLedgerKey(userId, day)),
    global: await readLedger(kv, globalLedgerKey(day)),
    halted: await isRelayerHalted(kv),
  };
}

export async function issueRelayerIntent(
  kv: KVNamespace,
  haltEnv: string | undefined,
  session: RelayerSession,
  op: RelayerOp,
  params: RelayerWriteParams,
  now = Date.now(),
): Promise<RelayerWriteResult<RelayerIntent>> {
  if (await isRelayerHalted(kv, haltEnv)) {
    return {
      ok: false,
      status: 503,
      body: {
        error: "Relayer writes are halted",
        code: "relayer_halt",
      },
    };
  }

  const normalized = await normalizeRelayerParams(op, params);
  if ("error" in normalized) {
    return { ok: false, status: 400, body: { error: normalized.error } };
  }

  const existingId = await kv.get(
    idempKey(session.userId, op, normalized.digest),
  );
  if (existingId) {
    const existing = (await kv.get(intentKey(existingId), "json")) as
      | RelayerIntent
      | null;
    if (existing?.status === "consumed" && existing.result) {
      return { ok: true, value: existing, intentId: existing.id, replay: true };
    }
  }

  const user = await readLedger(kv, userLedgerKey(session.userId, utcDay(now)));
  const global = await readLedger(kv, globalLedgerKey(utcDay(now)));
  if (
    wouldExceed(
      user,
      op,
      normalized.valueWei,
      ACCOUNT_DAILY_SPEND_WEI,
      ACCOUNT_DAILY_OPS[op],
    )
  ) {
    return budgetDenied(op, "account");
  }
  if (
    wouldExceed(
      global,
      op,
      normalized.valueWei,
      GLOBAL_DAILY_SPEND_WEI,
      GLOBAL_DAILY_OPS[op],
    )
  ) {
    return budgetDenied(op, "global");
  }

  const intent: RelayerIntent = {
    id: generateIntentId(),
    userId: session.userId,
    op,
    paramsDigest: normalized.digest,
    valueWei: normalized.valueWei.toString(),
    createdAt: now,
    expiresAt: now + INTENT_TTL_MS,
    status: "issued",
  };
  await kv.put(intentKey(intent.id), JSON.stringify(intent), {
    expirationTtl: Math.ceil(INTENT_TTL_MS / 1000) + 60,
  });
  return { ok: true, value: intent, intentId: intent.id, replay: false };
}

/**
 * Authenticate, bind params to a server-issued intent, reserve spend, then
 * run the chain write. Replays of a successful digest return the stored receipt.
 */
export async function runRelayerWrite<T extends Record<string, unknown>>(
  kv: KVNamespace,
  haltEnv: string | undefined,
  session: RelayerSession,
  op: RelayerOp,
  params: RelayerWriteParams,
  execute: () => Promise<T>,
  intentId?: string,
  now = Date.now(),
): Promise<RelayerWriteResult<T>> {
  if (await isRelayerHalted(kv, haltEnv)) {
    return {
      ok: false,
      status: 503,
      body: { error: "Relayer writes are halted", code: "relayer_halt" },
    };
  }

  const normalized = await normalizeRelayerParams(op, params);
  if ("error" in normalized) {
    return { ok: false, status: 400, body: { error: normalized.error } };
  }

  const replayId = await kv.get(
    idempKey(session.userId, op, normalized.digest),
  );
  if (replayId) {
    const prior = (await kv.get(intentKey(replayId), "json")) as
      | RelayerIntent
      | null;
    if (prior?.status === "consumed" && prior.result) {
      return {
        ok: true,
        value: prior.result as T,
        intentId: prior.id,
        replay: true,
      };
    }
  }

  let intent: RelayerIntent | null = null;
  if (intentId) {
    intent = (await kv.get(intentKey(intentId), "json")) as RelayerIntent | null;
    if (!intent || intent.userId !== session.userId || intent.op !== op) {
      return {
        ok: false,
        status: 409,
        body: { error: "Unknown or mismatched relayer intent", code: "bad_intent" },
      };
    }
    if (intent.paramsDigest !== normalized.digest) {
      return {
        ok: false,
        status: 409,
        body: {
          error: "Intent parameters do not match this operation",
          code: "intent_mismatch",
        },
      };
    }
    if (intent.status === "consumed" && intent.result) {
      return {
        ok: true,
        value: intent.result as T,
        intentId: intent.id,
        replay: true,
      };
    }
    if (intent.expiresAt < now) {
      return {
        ok: false,
        status: 409,
        body: { error: "Relayer intent expired", code: "intent_expired" },
      };
    }
  } else {
    const issued = await issueRelayerIntent(
      kv,
      haltEnv,
      session,
      op,
      params,
      now,
    );
    if (!issued.ok) return issued;
    if (issued.replay && issued.value.result) {
      return {
        ok: true,
        value: issued.value.result as T,
        intentId: issued.intentId,
        replay: true,
      };
    }
    intent = issued.value;
  }

  const reserved = await reserveSpend(
    kv,
    session.userId,
    op,
    normalized.valueWei,
  );
  if (!reserved.ok) return reserved;

  try {
    const value = await execute();
    const consumed: RelayerIntent = {
      ...intent,
      status: "consumed",
      result: value,
    };
    await kv.put(intentKey(intent.id), JSON.stringify(consumed), {
      expirationTtl: IDEMP_TTL_SECONDS,
    });
    await kv.put(
      idempKey(session.userId, op, normalized.digest),
      intent.id,
      { expirationTtl: IDEMP_TTL_SECONDS },
    );
    return { ok: true, value, intentId: intent.id, replay: false };
  } catch (err) {
    await releaseSpend(
      kv,
      session.userId,
      op,
      normalized.valueWei,
      reserved.day,
    );
    throw err;
  }
}

export function relayerSigningKey(
  op: RelayerOp,
  relayerKey: string | undefined,
  resolverKey: string | undefined,
): { ok: true; key: string } | { ok: false; status: number; body: Record<string, unknown> } {
  if (op === "resolve") {
    if (!resolverKey) {
      return {
        ok: false,
        status: 503,
        body: {
          error: "Resolver key is not configured; resolve is disabled",
          code: "resolver_unconfigured",
        },
      };
    }
    return { ok: true, key: resolverKey };
  }
  if (!relayerKey) {
    return {
      ok: false,
      status: 503,
      body: { error: "Relayer not configured", code: "relayer_unconfigured" },
    };
  }
  return { ok: true, key: relayerKey };
}
