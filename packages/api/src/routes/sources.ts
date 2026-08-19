import { Hono } from "hono";
import type { Env } from "../index.js";
import {
  getSkillEvidence,
  summarizeEvidence,
  type EvidenceSummary,
} from "../lib/skill-evidence.js";
import { getSkillRecord } from "../lib/skill-registry.js";

export const sourcesRoute = new Hono<{ Bindings: Env }>();

/** Entry stored per domain in KV (same shape as forge.ts writes). */
interface SourceEntry {
  skillHash: string;
  title: string;
  sourceUrl: string;
  canonicalSourceId?: string;
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

/**
 * Build one source snapshot from the domain index and durable evidence.
 * A source index is discovery data, so unlisted records are filtered even if
 * an older index entry has not been cleaned up yet.
 */
async function sourceSnapshot(
  env: Env,
  domain: string,
): Promise<{ skills: SourceSkillResponse[]; impact: SourceImpactSummary }> {
  const entries =
    (await env.SESSIONS.get(`source:${domain}`, "json")) as SourceEntry[] | null;
  if (!entries?.length) return { skills: [], impact: emptyImpact() };

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

  return { skills, impact };
}

/**
 * GET /sources/:domain — returns all skills forged from a given source domain.
 * Used by the /from/[source] page and the badge endpoint.
 */
sourcesRoute.get("/sources/:domain", async (c) => {
  const domain = c.req.param("domain")?.toLowerCase().replace(/^www\./, "");
  if (!domain) return c.json({ error: "domain required" }, 400);

  const snapshot = await sourceSnapshot(c.env, domain);
  return c.json({
    domain,
    skills: snapshot.skills,
    count: snapshot.skills.length,
    impact: snapshot.impact,
  });
});

/** Evidence summary only, useful for creator/source cards and aggregators. */
sourcesRoute.get("/sources/:domain/impact", async (c) => {
  const domain = c.req.param("domain")?.toLowerCase().replace(/^www\./, "");
  if (!domain) return c.json({ error: "domain required" }, 400);
  const snapshot = await sourceSnapshot(c.env, domain);
  return c.json({ domain, impact: snapshot.impact });
});

/**
 * GET /sources/:domain/badge.svg — returns an SVG badge showing forge count.
 * Designed for embedding in show notes, blog footers, READMEs.
 */
sourcesRoute.get("/sources/:domain/badge.svg", async (c) => {
  const domain = c.req.param("domain")?.toLowerCase().replace(/^www\./, "");
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
