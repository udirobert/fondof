/** Public skill identity + share helpers. */

export function skillPublicPath(hash: string): string {
  const clean = hash.startsWith("0x") ? hash : `0x${hash}`;
  return `/s/${encodeURIComponent(clean)}`;
}

export function skillShareUrl(hash: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://fondof.netlify.app");
  return `${base}${skillPublicPath(hash)}`;
}

export function skillTweetIntent(opts: {
  hash: string;
  title?: string;
  origin?: string;
}): string {
  const url = skillShareUrl(opts.hash, opts.origin);
  const label = opts.title?.trim() || "a skill";
  const text = `Forged ${label} on fondof — quality signal on Monad.\n${url}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

/** Canonical public source-impact page. */
export function sourcePublicPath(domain: string): string {
  return `/from/${encodeURIComponent(domain)}`;
}

export function sourceImpactShareUrl(domain: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://fondof.netlify.app");
  return `${base}${sourcePublicPath(domain)}`;
}

export function creatorPublicPath(login: string): string {
  return `/u/${encodeURIComponent(login)}`;
}

export function creatorImpactShareUrl(login: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://fondof.netlify.app");
  return `${base}${creatorPublicPath(login)}`;
}

export function creatorImpactTweetIntent(opts: {
  login: string;
  skillCount?: number;
  outcomeCount?: number;
  origin?: string;
}): string {
  const url = creatorImpactShareUrl(opts.login, opts.origin);
  const text = `@${opts.login} has forged ${opts.skillCount ?? 0} public skill${opts.skillCount === 1 ? "" : "s"}${opts.outcomeCount ? ` with ${opts.outcomeCount} outcome receipt${opts.outcomeCount === 1 ? "" : "s"}` : ""}. See the evidence trail on fondof — not a causal impact claim.\n${url}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function sourceImpactTweetIntent(opts: {
  domain: string;
  skillCount?: number;
  outcomeCount?: number;
  origin?: string;
}): string {
  const url = sourceImpactShareUrl(opts.domain, opts.origin);
  const evidence = opts.outcomeCount
    ? ` · ${opts.outcomeCount} outcome receipt${opts.outcomeCount === 1 ? "" : "s"}`
    : "";
  const text = `${opts.skillCount ?? 0} coding skill${opts.skillCount === 1 ? "" : "s"} forged from ${opts.domain}${evidence}. See what developers adapted with fondof — evidence summary, not causal proof.\n${url}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

/** Deep-link someone straight into ingest. */
export function fondofThisUrl(sourceUrl: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://fondof.netlify.app");
  return `${base}/?url=${encodeURIComponent(sourceUrl)}`;
}

/** Select a real source to re-forge, never the public fondof artifact itself. */
export function originalSourceUrl(
  sourceUrls: readonly string[] | null | undefined,
): string | null {
  for (const sourceUrl of sourceUrls ?? []) {
    try {
      const parsed = new URL(sourceUrl.trim());
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.toString();
      }
    } catch {
      // Ignore direct-need and malformed provenance values.
    }
  }
  return null;
}

/** Extract a parent skill hash from a public /s/[hash] URL. */
export function publicSkillHashFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/^\/s\/(0x?[a-f0-9]{8,})\/?$/i);
    return match ? match[1]!.toLowerCase().replace(/^0x/, "") : null;
  } catch {
    return null;
  }
}

/** Start a new repo-fitted forge from an original public source. */
export function sourceReforgePath(
  sourceUrls: readonly string[] | null | undefined,
): string | null {
  const sourceUrl = originalSourceUrl(sourceUrls);
  return sourceUrl ? `/?url=${encodeURIComponent(sourceUrl)}` : null;
}
