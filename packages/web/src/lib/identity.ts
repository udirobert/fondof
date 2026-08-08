import { shortAddress } from "@/lib/monad-chain";

export interface ResolvedIdentity {
  address: string;
  name: string | null;
  avatar: string | null;
  platform: string | null;
}

const cache = new Map<string, ResolvedIdentity>();
const inflight = new Map<string, Promise<ResolvedIdentity>>();

type Web3BioNs = {
  address?: string;
  identity?: string;
  platform?: string;
  displayName?: string;
  avatar?: string | null;
};

const PLATFORM_RANK: Record<string, number> = {
  ens: 0,
  basenames: 1,
  farcaster: 2,
  lens: 3,
};

function pickBest(profiles: Web3BioNs[]): Web3BioNs | null {
  if (!profiles.length) return null;
  return [...profiles].sort(
    (a, b) =>
      (PLATFORM_RANK[a.platform ?? ""] ?? 9) -
      (PLATFORM_RANK[b.platform ?? ""] ?? 9),
  )[0];
}

async function fromWeb3Bio(address: string): Promise<ResolvedIdentity | null> {
  const res = await fetch(
    `https://api.web3.bio/ns/${encodeURIComponent(address)}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Web3BioNs[] | Web3BioNs;
  const list = Array.isArray(data) ? data : [data];
  const best = pickBest(list.filter((p) => p.identity || p.displayName));
  if (!best) return null;
  return {
    address,
    name: best.displayName || best.identity || null,
    avatar: best.avatar ?? null,
    platform: best.platform ?? null,
  };
}

async function fromEnsData(address: string): Promise<ResolvedIdentity | null> {
  const res = await fetch(
    `https://ensdata.net/${encodeURIComponent(address)}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    ens?: string;
    ens_primary?: string;
    avatar?: string;
    avatar_small?: string;
  };
  if (!data.ens && !data.ens_primary) return null;
  return {
    address,
    name: data.ens_primary || data.ens || null,
    avatar: data.avatar_small || data.avatar || null,
    platform: "ens",
  };
}

/** Resolve ENS / Basename / Farcaster via web3.bio, ensdata fallback. */
export async function resolveIdentity(
  address: string,
): Promise<ResolvedIdentity> {
  const key = address.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    let resolved: ResolvedIdentity = {
      address,
      name: null,
      avatar: null,
      platform: null,
    };
    try {
      resolved = (await fromWeb3Bio(address)) ?? resolved;
    } catch {
      // try fallback
    }
    if (!resolved.name) {
      try {
        resolved = (await fromEnsData(address)) ?? resolved;
      } catch {
        // keep truncated address
      }
    }
    cache.set(key, resolved);
    inflight.delete(key);
    return resolved;
  })();

  inflight.set(key, job);
  return job;
}

export function identityLabel(id: ResolvedIdentity): string {
  return id.name || shortAddress(id.address);
}

export async function resolveIdentities(
  addresses: string[],
): Promise<Map<string, ResolvedIdentity>> {
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
  const results = await Promise.all(
    unique.map(async (addr) => {
      const original = addresses.find((a) => a.toLowerCase() === addr) ?? addr;
      return [addr, await resolveIdentity(original)] as const;
    }),
  );
  return new Map(results);
}
