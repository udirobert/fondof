import { Hono } from "hono";
import type { Env } from "../index.js";

export const sourcesRoute = new Hono<{ Bindings: Env }>();

/** Entry stored per domain in KV (same shape as forge.ts writes). */
interface SourceEntry {
  skillHash: string;
  title: string;
  sourceUrl: string;
  fittedTo: string;
  forgedAt: string;
}

/**
 * GET /sources/:domain — returns all skills forged from a given source domain.
 * Used by the /from/[source] page and the badge endpoint.
 */
sourcesRoute.get("/sources/:domain", async (c) => {
  const domain = c.req.param("domain")?.toLowerCase().replace(/^www\./, "");
  if (!domain) return c.json({ error: "domain required" }, 400);

  const sourceKey = `source:${domain}`;
  const entries =
    (await c.env.SESSIONS.get(sourceKey, "json")) as SourceEntry[] | null;

  if (!entries || entries.length === 0) {
    return c.json({ domain, skills: [], count: 0 });
  }

  // Sort by most recent first
  const sorted = [...entries].sort(
    (a, b) => new Date(b.forgedAt).getTime() - new Date(a.forgedAt).getTime(),
  );

  return c.json({
    domain,
    skills: sorted,
    count: sorted.length,
  });
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

  const sourceKey = `source:${domain}`;
  const entries =
    (await c.env.SESSIONS.get(sourceKey, "json")) as SourceEntry[] | null;
  const count = entries?.length ?? 0;

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
