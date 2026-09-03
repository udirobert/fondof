/**
 * URL/need detection helpers shared by the quick and studio input pads.
 */

export function isUrlLike(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) return true;
  // Bare domain-ish: e.g. "nextjs.org/blog/next-16-3" with no spaces
  if (!/\s/.test(trimmed) && /\.[a-z]{2,}(\/|$)/i.test(trimmed)) return true;
  return false;
}

export function looksLikeUrlList(value: string): boolean {
  const tokens = value.trim().split(/\r?\n|\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every(isUrlLike);
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return `https://${trimmed}`;
}

export function parseUrlList(value: string, max = 4): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const token of value.split(/\r?\n|\s+/)) {
    const trimmed = token.trim();
    if (!trimmed || !isUrlLike(trimmed)) continue;
    const url = normalizeUrl(trimmed);
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= max) break;
  }
  return urls;
}
