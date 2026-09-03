import { Hono } from "hono";
import type { Env } from "../index.js";
import {
  getSkillEvidence,
  summarizeEvidence,
  type EvidenceSummary,
} from "../lib/skill-evidence.js";
import { getSkillRecord } from "../lib/skill-registry.js";
import { safeFetch } from "../lib/ssrf.js";
import { getSourceEntity, type SourceEntity } from "../lib/source-url.js";
import { resolveSession } from "./auth.js";

export const sourcesRoute = new Hono<{ Bindings: Env }>();

/** Entry stored per domain in KV (same shape as forge.ts writes). */
interface SourceEntry {
  skillHash: string;
  title: string;
  sourceUrl: string;
  canonicalSourceId?: string;
  sourceMeta?: { author?: string; siteName?: string; show?: string; publishedAt?: string; feedUrl?: string };
  fittedTo: string;
  forgedAt: string;
}

export interface SourceImpactSummary extends EvidenceSummary {
  skillCount: number;
  skillsWithEvidence: number;
  remixCount: number;
  fittedRepoCount: number;
}

export interface SourceSkillResponse extends SourceEntry {
  derivedFromSkillHash?: string;
  evidence?: EvidenceSummary;
}

export type SourceClaimStatus = "self-claimed" | "domain-verified";

export interface SourceClaim {
  domain: string;
  login: string;
  userId: number;
  status: SourceClaimStatus;
  claimedAt: string;
  proofUrl?: string;
  verifiedAt?: string;
}

interface SourceClaimChallenge {
  domain: string;
  userId: number;
  token: string;
  createdAt: string;
}

const CLAIM_CHALLENGE_TTL = 15 * 60;

function claimKey(domain: string): string {
  return `source-claim:${domain}`;
}

function challengeKey(domain: string, userId: number): string {
  return `source-claim-challenge:${domain}:${userId}`;
}

function normalizeDomain(raw: string): string {
  return raw.toLowerCase().replace(/^www\./, "");
}

function emptyImpact(): SourceImpactSummary {
  return {
    skillCount: 0,
    skillsWithEvidence: 0,
    remixCount: 0,
    fittedRepoCount: 0,
    claimedUseCount: 0,
    outcomeCount: 0,
    linkedPrCount: 0,
    githubConfirmedPrCount: 0,
    mergedPrCount: 0,
    evidenceScore: 0,
  };
}

async function buildSourceSnapshot(
  env: Env,
  entries: SourceEntry[] | null,
  domain: string,
): Promise<{
  skills: SourceSkillResponse[];
  impact: SourceImpactSummary;
  claim: SourceClaim | null;
}> {
  const claim = (await env.SESSIONS.get(claimKey(domain), "json")) as SourceClaim | null;
  if (!entries?.length) return { skills: [], impact: emptyImpact(), claim };

  const unique = new Map<string, SourceSkillResponse>();
  await Promise.all(
    entries.map(async (entry) => {
      const hash = entry.skillHash.toLowerCase().replace(/^0x/, "");
      if (unique.has(hash)) return;
      const record = await getSkillRecord(env, hash);
      if (record?.visibility === "unlisted") return;
      const evidence = await getSkillEvidence(env, hash);
      unique.set(hash, {
        ...entry,
        skillHash: hash,
        derivedFromSkillHash: record?.derivedFromSkillHash,
        evidence: summarizeEvidence(evidence),
      });
    }),
  );

  const skills = [...unique.values()].sort(
    (a, b) => new Date(b.forgedAt).getTime() - new Date(a.forgedAt).getTime(),
  );
  const impact = skills.reduce((summary, skill) => {
    const evidence = skill.evidence ?? summarizeEvidence(null);
    summary.claimedUseCount += evidence.claimedUseCount;
    summary.outcomeCount += evidence.outcomeCount;
    summary.linkedPrCount += evidence.linkedPrCount;
    summary.githubConfirmedPrCount += evidence.githubConfirmedPrCount;
    summary.mergedPrCount += evidence.mergedPrCount;
    summary.evidenceScore += evidence.evidenceScore;
    if (evidence.evidenceScore > 0) summary.skillsWithEvidence += 1;
    if (skill.derivedFromSkillHash) summary.remixCount += 1;
    return summary;
  }, emptyImpact());
  impact.skillCount = skills.length;
  impact.fittedRepoCount = new Set(
    skills.map((skill) => skill.fittedTo).filter(Boolean),
  ).size;

  return { skills, impact, claim };
}

/**
 * Build one source snapshot from the domain index and durable evidence.
 * A source index is discovery data, so unlisted records are filtered even if
 * an older index entry has not been cleaned up yet.
 */
async function sourceSnapshot(
  env: Env,
  domain: string,
): Promise<{
  skills: SourceSkillResponse[];
  impact: SourceImpactSummary;
  claim: SourceClaim | null;
}> {
  const entries =
    (await env.SESSIONS.get(`source:${domain}`, "json")) as SourceEntry[] | null;
  return buildSourceSnapshot(env, entries, domain);
}

/**
 * GET /sources/:domain — returns all skills forged from a given source domain.
 * Used by the /from/[source] page and the badge endpoint.
 */
sourcesRoute.get("/sources/:domain", async (c) => {
  const domain = normalizeDomain(c.req.param("domain") ?? "");
  if (!domain) return c.json({ error: "domain required" }, 400);

  const snapshot = await sourceSnapshot(c.env, domain);
  return c.json({
    domain,
    skills: snapshot.skills,
    count: snapshot.skills.length,
    impact: snapshot.impact,
    claim: snapshot.claim,
  });
});

/** Evidence summary only, useful for creator/source cards and aggregators. */
sourcesRoute.get("/sources/:domain/impact", async (c) => {
  const domain = normalizeDomain(c.req.param("domain") ?? "");
  if (!domain) return c.json({ error: "domain required" }, 400);
  const snapshot = await sourceSnapshot(c.env, domain);
  return c.json({ domain, impact: snapshot.impact, claim: snapshot.claim });
});

/**
 * GET /source/:id — returns a specific canonical source entity and the
 * skills forged from it. /source/:id decouples attribution from coarse domains
 * (e.g. every YouTube video has its own canonical source id).
 */
sourcesRoute.get("/source/:id", async (c) => {
  const id = c.req.param("id")?.trim() ?? "";
  if (!id) return c.json({ error: "source id required" }, 400);

  const entity = await getSourceEntity(c.env, id);
  if (!entity) {
    return c.json({ error: "source not found" }, 404);
  }

  const entries =
    (await c.env.SESSIONS.get(`source-skills:${id}`, "json")) as SourceEntry[] | null;
  const snapshot = await buildSourceSnapshot(c.env, entries, entity.domain);

  return c.json({
    source: entity,
    domain: entity.domain,
    skills: snapshot.skills,
    count: snapshot.skills.length,
    impact: snapshot.impact,
    claim: snapshot.claim,
  });
});

/**
 * Self-claim a source domain. This is an attribution hint, not independent
 * proof of authorship or authority over the domain.
 */
sourcesRoute.post("/sources/:domain/claim", async (c) => {
  const domain = normalizeDomain(c.req.param("domain") ?? "");
  if (!domain) return c.json({ error: "domain required" }, 400);
  const session = await resolveSession(c);
  if (!session) return c.json({ error: "Sign in with GitHub to claim a source" }, 401);

  const existing = (await c.env.SESSIONS.get(claimKey(domain), "json")) as SourceClaim | null;
  if (existing && existing.userId !== session.userId) {
    return c.json({ error: "This source already has a self-claim" }, 409);
  }

  const claim: SourceClaim = {
    domain,
    login: session.login,
    userId: session.userId,
    status: "self-claimed",
    claimedAt: existing?.claimedAt ?? new Date().toISOString(),
  };
  await c.env.SESSIONS.put(claimKey(domain), JSON.stringify(claim));
  return c.json({ success: true, claim });
});

/** Create a short-lived nonce for proving control of a source domain. */
sourcesRoute.post("/sources/:domain/claim/challenge", async (c) => {
  const domain = normalizeDomain(c.req.param("domain") ?? "");
  if (!domain) return c.json({ error: "domain required" }, 400);
  const session = await resolveSession(c);
  if (!session) return c.json({ error: "Sign in with GitHub to verify a source" }, 401);

  const claim = (await c.env.SESSIONS.get(claimKey(domain), "json")) as SourceClaim | null;
  if (!claim || claim.userId !== session.userId) {
    return c.json({ error: "Create your self-claim before verifying domain control" }, 403);
  }

  const token = `fondof-claim-${crypto.randomUUID()}`;
  const challenge: SourceClaimChallenge = {
    domain,
    userId: session.userId,
    token,
    createdAt: new Date().toISOString(),
  };
  await c.env.SESSIONS.put(
    challengeKey(domain, session.userId),
    JSON.stringify(challenge),
    { expirationTtl: CLAIM_CHALLENGE_TTL },
  );
  return c.json({
    success: true,
    token,
    instructions: `Publish this exact token on a public page under https://${domain}, then submit that page URL to verify control.`,
    expiresInSeconds: CLAIM_CHALLENGE_TTL,
  });
});

/** Verify a nonce published on a page under the claimed domain. */
sourcesRoute.post("/sources/:domain/claim/verify", async (c) => {
  const domain = normalizeDomain(c.req.param("domain") ?? "");
  if (!domain) return c.json({ error: "domain required" }, 400);
  const session = await resolveSession(c);
  if (!session) return c.json({ error: "Sign in with GitHub to verify a source" }, 401);
  const body = (await c.req
    .json<{ proofUrl?: string }>()
    .catch(() => ({}))) as { proofUrl?: string };
  const proofUrl = body.proofUrl?.trim();
  if (!proofUrl) return c.json({ error: "proofUrl is required" }, 400);

  const claim = (await c.env.SESSIONS.get(claimKey(domain), "json")) as SourceClaim | null;
  if (!claim || claim.userId !== session.userId) {
    return c.json({ error: "Create your self-claim before verifying domain control" }, 403);
  }
  const challenge = (await c.env.SESSIONS.get(
    challengeKey(domain, session.userId),
    "json",
  )) as SourceClaimChallenge | null;
  if (!challenge) return c.json({ error: "Verification challenge expired" }, 410);

  let parsed: URL;
  try {
    parsed = new URL(proofUrl);
  } catch {
    return c.json({ error: "proofUrl must be a valid URL" }, 422);
  }
  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    normalizeDomain(parsed.hostname) !== domain
  ) {
    return c.json({ error: "Proof URL must be hosted on the claimed domain" }, 422);
  }
  const fetched = await safeFetch(parsed.toString(), {
    headers: { "User-Agent": "fondof-source-verifier" },
    maxBytes: 500_000,
    sameNormalizedHost: domain,
  });
  if (!fetched.ok) {
    if (fetched.reason.startsWith("http ")) {
      return c.json(
        { error: `Proof URL returned ${fetched.reason.slice(5)}` },
        422,
      );
    }
    if (fetched.reason === "request failed") {
      return c.json({ error: "Could not reach the proof URL" }, 502);
    }
    return c.json({ error: "Proof URL is not fetchable" }, 422);
  }
  const text = fetched.body;
  if (!text.includes(challenge.token)) {
    return c.json({ error: "The verification token was not found on that page" }, 422);
  }

  const verifiedAt = new Date().toISOString();
  const verifiedClaim: SourceClaim = {
    ...claim,
    status: "domain-verified",
    proofUrl: parsed.toString().slice(0, 500),
    verifiedAt,
  };
  await c.env.SESSIONS.put(claimKey(domain), JSON.stringify(verifiedClaim));
  await c.env.SESSIONS.delete(challengeKey(domain, session.userId));
  return c.json({
    success: true,
    claim: verifiedClaim,
    note: "Domain control verified; this still does not independently verify authorship or influence.",
  });
});

/**
 * GET /sources/:domain/badge.svg — returns an SVG badge showing forge count.
 * Designed for embedding in show notes, blog footers, READMEs.
 */
sourcesRoute.get("/sources/:domain/badge.svg", async (c) => {
  const domain = normalizeDomain(c.req.param("domain") ?? "");
  if (!domain) {
    return c.text("missing domain", 400);
  }

  const snapshot = await sourceSnapshot(c.env, domain);
  const count = snapshot.skills.length;

  const label = "forged from";
  const value = `${count} skill${count === 1 ? "" : "s"}`;

  // Shield-style badge SVG
  const labelWidth = label.length * 6.5 + 12;
  const valueWidth = value.length * 6.5 + 12;
  const totalWidth = labelWidth + valueWidth;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="#e55039"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;

  c.header("Content-Type", "image/svg+xml");
  c.header("Cache-Control", "public, max-age=300"); // 5 min cache
  return c.body(svg);
});
