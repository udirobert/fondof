import type { Env } from "../index.js";
import {
  callCoordinator,
  type ExchangePayload,
} from "../durable/coordinator.js";

const KV_PREFIX = "oauth-exchange:";

function kvKey(code: string): string {
  return KV_PREFIX + code;
}

export async function storeOAuthExchange(
  env: Env,
  code: string,
  payload: { token: string; browserNonce: string },
  ttlSeconds: number,
): Promise<void> {
  const record: ExchangePayload = {
    ...payload,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
  const viaDo = await callCoordinator(env, "oauth", {
    op: "put-exchange",
    code,
    payload: record,
  });
  if (viaDo) return;
  await env.SESSIONS.put(kvKey(code), JSON.stringify(record), {
    expirationTtl: ttlSeconds,
  });
}

export async function peekOAuthExchange(
  env: Env,
  code: string,
): Promise<ExchangePayload | null> {
  const viaDo = await callCoordinator(env, "oauth", {
    op: "peek-exchange",
    code,
  });
  if (viaDo) return viaDo.ok ? viaDo.payload ?? null : null;
  const raw = await env.SESSIONS.get(kvKey(code));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExchangePayload;
    if (!parsed.token || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Atomic get-and-delete. Concurrent callers: only one receives the payload. */
export async function takeOAuthExchange(
  env: Env,
  code: string,
): Promise<ExchangePayload | null> {
  const viaDo = await callCoordinator(env, "oauth", {
    op: "take-exchange",
    code,
  });
  if (viaDo) return viaDo.ok ? viaDo.payload ?? null : null;
  const key = kvKey(code);
  const raw = await env.SESSIONS.get(key);
  await env.SESSIONS.delete(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExchangePayload;
    if (!parsed.token || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
