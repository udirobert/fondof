/**
 * Repo context resolution for /api/compose.
 *
 * Agents should not have to introspect their own stack. Compose accepts
 * either a full repo object or just "owner/name" (or a GitHub URL), and we
 * detect frameworks/languages from the repo's manifests via the public
 * GitHub API (no auth required for public repos).
 */

export interface RepoContext {
  name: string;
  frameworks: string[];
  languages: string[];
}

/** What compose accepts for `repo` — a ref, URL, plain name, or partial object. */
export type RepoInput =
  | string
  | { name: string; frameworks?: string[]; languages?: string[] }
  | undefined
  | null;

const REPO_TTL = 60 * 60; // 1h — manifests don't churn that fast

/** Known framework markers, matched exactly against npm dependency names. */
const FRAMEWORKS = [
  "next",
  "react",
  "react-native",
  "vue",
  "svelte",
  "astro",
  "nuxt",
  "express",
  "fastify",
  "hono",
  "tailwindcss",
  "remotion",
  "hyperframes",
  "playwright",
  "vitest",
  "jest",
  "cypress",
  "prisma",
  "drizzle",
  "openai",
] as const;

/**
 * Pure stack inference from a package.json dependency map.
 * Exact dependency-name match ("next-themes" is not "next").
 */
export function inferStack(
  deps: Record<string, unknown>,
): { frameworks: string[]; languages: string[] } {
  const keys = new Set(Object.keys(deps).map((k) => k.toLowerCase()));
  const frameworks = FRAMEWORKS.filter((f) => keys.has(f));

  const languages: string[] = [];
  if (keys.has("typescript")) languages.push("typescript");
  languages.push("javascript");

  return { frameworks, languages };
}

function cleanName(name: string): string {
  return name.replace(/\.git$/, "").trim();
}

/**
 * Parse "owner/name" or a GitHub URL into an owner/repo ref.
 */
export function parseRepoRef(
  input: string,
): { owner: string; repo: string } | null {
  const t = input.trim();
  const urlMatch = t.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (urlMatch) {
    return { owner: urlMatch[1]!, repo: cleanName(urlMatch[2]!) };
  }
  const refMatch = t.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (refMatch) {
    return { owner: refMatch[1]!, repo: cleanName(refMatch[2]!) };
  }
  return null;
}

/**
 * Resolve a compose `repo` input into a RepoContext.
 *
 * - object → normalized as-is
 * - "owner/name" / GitHub URL → detect via GitHub API (best-effort, KV-cached)
 * - plain name / anything else → name only (forge falls back to general TS)
 * - undefined → undefined (forge default)
 */
export async function resolveRepoContext(
  input: RepoInput,
  kv?: KVNamespace,
): Promise<RepoContext | undefined> {
  if (input === undefined || input === null) return undefined;

  // Object form — normalize and trust the caller.
  if (typeof input === "object") {
    const name = String(input.name ?? "").trim().slice(0, 120);
    if (!name) return undefined;
    return {
      name,
      frameworks: (input.frameworks ?? []).map(String).slice(0, 8),
      languages: (input.languages ?? []).map(String).slice(0, 8),
    };
  }

  const t = String(input).trim();
  if (!t) return undefined;

  const ref = parseRepoRef(t);
  if (!ref) {
    // Not a ref — treat the whole string as a repo name.
    return { name: t.slice(0, 80), frameworks: [], languages: [] };
  }

  const cacheKey = `repo-ctx:${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}`;
  if (kv) {
    try {
      const cached = (await kv.get(cacheKey, "json")) as RepoContext | null;
      if (cached?.name) return cached;
    } catch {
      // fall through to network
    }
  }

  const detected = await detectRepo(ref.owner, ref.repo);

  if (kv) {
    try {
      await kv.put(cacheKey, JSON.stringify(detected), {
        expirationTtl: REPO_TTL,
      });
    } catch {
      // non-fatal
    }
  }

  return detected;
}

async function detectRepo(owner: string, repo: string): Promise<RepoContext> {
  const fallback: RepoContext = { name: repo, frameworks: [], languages: [] };
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "fondof",
      },
    });
    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      name?: string;
      default_branch?: string;
    };
    const name = data.name || repo;
    const branch = data.default_branch || "main";

    const pkgRes = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`,
    );
    if (!pkgRes.ok) return { ...fallback, name };

    const pkg = (await pkgRes.json()) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };
    const { frameworks, languages } = inferStack({
      ...pkg.dependencies,
      ...pkg.devDependencies,
    });

    return { name, frameworks, languages };
  } catch {
    return fallback;
  }
}
