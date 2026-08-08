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

/** Deep-link someone straight into ingest. */
export function fondofThisUrl(sourceUrl: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://fondof.netlify.app");
  return `${base}/?url=${encodeURIComponent(sourceUrl)}`;
}
