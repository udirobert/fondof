/**
 * Per-name Durable Object for one-at-a-time mutations that KV cannot
 * express (compare-and-delete, read-modify-write counters).
 *
 * Names:
 *   oauth              — one-time OAuth exchange codes
 *   evidence:{hash}    — claimed-use markers + aggregate for one skill
 */
import type { Env } from "../index.js";
import type { ClaimedUseResult } from "../lib/skill-evidence.js";

export type ExchangePayload = {
  token: string;
  browserNonce: string;
  expiresAt: number;
};

export type CoordinatorRequest =
  | { op: "put-exchange"; code: string; payload: ExchangePayload }
  | { op: "peek-exchange"; code: string }
  | { op: "take-exchange"; code: string }
  | { op: "claim-use"; hash: string; actorKey?: string };

export type CoordinatorResponse =
  | { ok: true; payload?: ExchangePayload; claim?: ClaimedUseResult }
  | { ok: false; error: string };

export interface AtomicStore {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

function exchangeKey(code: string): string {
  return `ex:${code}`;
}

export async function dispatchCoordinator(
  store: AtomicStore,
  env: Pick<Env, "SESSIONS">,
  request: CoordinatorRequest,
): Promise<CoordinatorResponse> {
  switch (request.op) {
    case "put-exchange": {
      await store.put(exchangeKey(request.code), request.payload);
      return { ok: true };
    }
    case "peek-exchange": {
      const payload = await store.get<ExchangePayload>(exchangeKey(request.code));
      if (!payload || payload.expiresAt <= Date.now()) {
        if (payload) await store.delete(exchangeKey(request.code));
        return { ok: false, error: "missing" };
      }
      return { ok: true, payload };
    }
    case "take-exchange": {
      const payload = await store.get<ExchangePayload>(exchangeKey(request.code));
      await store.delete(exchangeKey(request.code));
      if (!payload || payload.expiresAt <= Date.now()) {
        return { ok: false, error: "missing" };
      }
      return { ok: true, payload };
    }
    case "claim-use": {
      const { applyClaimedUse } = await import("../lib/skill-evidence.js");
      const claim = await applyClaimedUse(
        env as Env,
        request.hash,
        request.actorKey,
      );
      return { ok: true, claim };
    }
    default:
      return { ok: false, error: "unknown_op" };
  }
}

function durableStore(storage: DurableObjectStorage): AtomicStore {
  return {
    async get<T>(key: string) {
      return (await storage.get<T>(key)) as T | undefined;
    },
    async put(key: string, value: unknown) {
      await storage.put(key, value as never);
    },
    async delete(key: string) {
      await storage.delete(key);
    },
  };
}

/** Production Durable Object. Requests to one instance are serialized. */
export class FondofCoordinator {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    let body: CoordinatorRequest;
    try {
      body = (await request.json()) as CoordinatorRequest;
    } catch {
      return Response.json({ ok: false, error: "bad_json" } satisfies CoordinatorResponse, {
        status: 400,
      });
    }
    const result = await dispatchCoordinator(
      durableStore(this.state.storage),
      this.env,
      body,
    );
    return Response.json(result);
  }
}

class MemoryStore implements AtomicStore {
  constructor(private readonly map: Map<string, unknown>) {}
  async get<T>(key: string) {
    return this.map.get(key) as T | undefined;
  }
  async put(key: string, value: unknown) {
    this.map.set(key, value);
  }
  async delete(key: string) {
    this.map.delete(key);
  }
}

class MemoryStub {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly store: AtomicStore,
    private readonly env: Pick<Env, "SESSIONS">,
  ) {}

  fetch(_url: string, init?: RequestInit): Promise<Response> {
    const run = this.tail.then(async () => {
      const body = JSON.parse(String(init?.body ?? "{}")) as CoordinatorRequest;
      const result = await dispatchCoordinator(this.store, this.env, body);
      return Response.json(result);
    });
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

/**
 * In-process Durable Object stand-in for tests: per-name serialized fetch.
 */
export function createMemoryCoordinator(
  env: Pick<Env, "SESSIONS">,
): DurableObjectNamespace {
  const objects = new Map<string, MemoryStub>();
  return {
    idFromName(name: string) {
      return { toString: () => name } as DurableObjectId;
    },
    get(id: DurableObjectId) {
      const name = String(id);
      let stub = objects.get(name);
      if (!stub) {
        stub = new MemoryStub(new MemoryStore(new Map()), env);
        objects.set(name, stub);
      }
      return stub as unknown as DurableObjectStub;
    },
  } as DurableObjectNamespace;
}

export async function callCoordinator(
  env: Pick<Env, "COORDINATOR" | "SESSIONS">,
  name: string,
  request: CoordinatorRequest,
): Promise<CoordinatorResponse | null> {
  const ns = env.COORDINATOR;
  if (!ns) return null;
  const stub = ns.get(ns.idFromName(name));
  const res = await stub.fetch("https://fondof.internal/coordinator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return (await res.json()) as CoordinatorResponse;
}
