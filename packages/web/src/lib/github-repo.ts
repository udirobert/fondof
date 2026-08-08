import type { DemoRepo } from "@/lib/demo-data";

export type ConnectedRepo = DemoRepo & {
  description?: string;
  topics?: string[];
  source: "demo" | "github";
  private?: boolean;
};

const FRAMEWORK_HINTS: Array<{ re: RegExp; name: string }> = [
  { re: /\bnext\.?js\b|\bnext\b/i, name: "Next.js" },
  { re: /\breact\b/i, name: "React" },
  { re: /\bhono\b/i, name: "Hono" },
  { re: /\bworkers?\b|\bcloudflare\b/i, name: "Workers" },
  { re: /\btailwind\b/i, name: "Tailwind" },
  { re: /\bsolidity\b|\bfoundry\b|\bevm\b/i, name: "Solidity" },
  { re: /\bviem\b|\bwagmi\b/i, name: "viem" },
  { re: /\bexpress\b/i, name: "Express" },
  { re: /\bfastify\b/i, name: "Fastify" },
  { re: /\bprisma\b/i, name: "Prisma" },
  { re: /\bdrizzle\b/i, name: "Drizzle" },
];

const TOKEN_KEY = "fondof.githubToken";

export function getGitHubToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setGitHubToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!token?.trim()) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token.trim());
  } catch {
    // ignore
  }
}

/** Parse `owner/repo` or GitHub URL. */
export function parseGitHubRepo(
  input: string,
): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(
    /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i,
  );
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ""),
    };
  }
  const short = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (short) return { owner: short[1], repo: short[2].replace(/\.git$/, "") };
  return null;
}

function detectFrameworks(blob: string): string[] {
  const hits: string[] = [];
  for (const hint of FRAMEWORK_HINTS) {
    if (hint.re.test(blob) && !hits.includes(hint.name)) hits.push(hint.name);
  }
  return hits.slice(0, 6);
}

/**
 * Fetch repo metadata. Optional PAT (localStorage) unlocks private repos.
 * Token stays in the browser — never sent to fondof API.
 */
export async function fetchGitHubRepo(
  input: string,
  token?: string | null,
): Promise<ConnectedRepo> {
  const parsed = parseGitHubRepo(input);
  if (!parsed) {
    throw new Error("Use owner/repo or a github.com URL");
  }

  const { owner, repo } = parsed;
  const auth = (token ?? getGitHubToken())?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (auth) headers.Authorization = `Bearer ${auth}`;

  const [metaRes, langRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
      headers,
    }),
  ]);

  if (metaRes.status === 404) {
    throw new Error(
      auth
        ? "Repo not found (check name or token scopes: repo)"
        : "Repo not found — add a GitHub token for private repos",
    );
  }
  if (metaRes.status === 401 || metaRes.status === 403) {
    throw new Error("GitHub auth failed — check your token");
  }
  if (!metaRes.ok) {
    throw new Error(`GitHub error ${metaRes.status}`);
  }

  const meta = (await metaRes.json()) as {
    name: string;
    full_name: string;
    description?: string | null;
    topics?: string[];
    language?: string | null;
    private?: boolean;
  };

  const langJson = langRes.ok
    ? ((await langRes.json()) as Record<string, number>)
    : {};
  const total = Object.values(langJson).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(langJson)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([language, bytes]) => ({
      language,
      percentage: Math.round((bytes / total) * 100),
    }));

  if (languages.length === 0 && meta.language) {
    languages.push({ language: meta.language, percentage: 100 });
  }

  const blob = [
    meta.description ?? "",
    ...(meta.topics ?? []),
    ...languages.map((l) => l.language),
  ].join(" ");

  return {
    name: meta.name,
    fullName: meta.full_name,
    languages,
    frameworks: detectFrameworks(blob),
    description: meta.description ?? undefined,
    topics: meta.topics ?? [],
    matchCount: 0,
    lastIndexed: new Date().toISOString(),
    source: "github",
    private: !!meta.private,
  };
}

export function asConnected(demo: DemoRepo): ConnectedRepo {
  return { ...demo, source: "demo", topics: [], description: undefined };
}
