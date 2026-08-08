/**
 * GitHub REST API client for repository operations.
 */

export interface GitHubRepo {
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  private: boolean;
  updatedAt: string;
}

export interface GitHubLanguages {
  [language: string]: number; // language → bytes
}

export interface GitHubTreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

export interface GitHubFileContent {
  content: string; // base64 encoded
  encoding: string;
  path: string;
}

const GITHUB_API = "https://api.github.com";

/**
 * List repositories for the authenticated user.
 */
export async function listRepos(
  token: string,
  options?: { sort?: "updated" | "created" | "pushed"; perPage?: number }
): Promise<GitHubRepo[]> {
  const sort = options?.sort ?? "updated";
  const perPage = options?.perPage ?? 30;

  const response = await githubFetch(
    `${GITHUB_API}/user/repos?sort=${sort}&per_page=${perPage}&type=owner`,
    token
  );

  const data = (await response.json()) as Array<{
    name: string;
    full_name: string;
    owner: { login: string };
    description: string | null;
    language: string | null;
    default_branch: string;
    private: boolean;
    updated_at: string;
  }>;

  return data.map((repo) => ({
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    description: repo.description,
    language: repo.language,
    defaultBranch: repo.default_branch,
    private: repo.private,
    updatedAt: repo.updated_at,
  }));
}

/**
 * Get language breakdown for a repository.
 */
export async function getLanguages(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubLanguages> {
  const response = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/languages`,
    token
  );
  return (await response.json()) as GitHubLanguages;
}

/**
 * Get the file tree (top 2 levels) for a repository.
 */
export async function getTree(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubTreeEntry[]> {
  const response = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token
  );

  const data = (await response.json()) as {
    tree: Array<{ path: string; type: string; size?: number }>;
    truncated: boolean;
  };

  return data.tree
    .filter((entry) => entry.path.split("/").length <= 3) // limit depth
    .map((entry) => ({
      path: entry.path,
      type: entry.type as "blob" | "tree",
      size: entry.size,
    }));
}

/**
 * Get the content of a specific file from a repository.
 */
export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const response = await githubFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
      token
    );

    if (!response.ok) return null;

    const data = (await response.json()) as GitHubFileContent;
    if (data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return data.content;
  } catch {
    return null;
  }
}

/**
 * Get open issues themes (titles of recent issues).
 */
export async function getOpenIssues(
  token: string,
  owner: string,
  repo: string,
  perPage = 10
): Promise<string[]> {
  try {
    const response = await githubFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/issues?state=open&per_page=${perPage}&sort=updated`,
      token
    );

    const data = (await response.json()) as Array<{
      title: string;
      pull_request?: unknown;
    }>;

    // Filter out pull requests (they show up in the issues endpoint)
    return data
      .filter((issue) => !issue.pull_request)
      .map((issue) => issue.title);
  } catch {
    return [];
  }
}

async function githubFetch(url: string, token: string): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "fondof/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText} (${url})`);
  }

  return response;
}
