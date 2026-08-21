/** Sign-in only needs profile. Publish is an incremental grant. */
export const GITHUB_SIGN_IN_SCOPES = "read:user";
export const GITHUB_PUBLISH_SCOPES = "read:user gist repo";

export type GitHubPublishKind = "gist" | "repo";

export function githubScopesForIntent(intent: string | undefined): string {
  return intent === "publish" ? GITHUB_PUBLISH_SCOPES : GITHUB_SIGN_IN_SCOPES;
}

export function parseOAuthScopes(header: string | null | undefined): Set<string> {
  return new Set(
    (header ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * Scopes GitHub must have granted for the chosen publish target.
 * `public_repo` is accepted for repository contents on public repos.
 */
export function missingGitHubPublishScopes(
  granted: Iterable<string>,
  kind: GitHubPublishKind,
): string[] {
  const set = granted instanceof Set ? granted : new Set(granted);
  if (kind === "gist") return set.has("gist") ? [] : ["gist"];
  if (set.has("repo") || set.has("public_repo")) return [];
  return ["repo"];
}

export async function readGitHubOAuthScopes(
  accessToken: string,
): Promise<Set<string>> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "fondof-api",
    },
  });
  return parseOAuthScopes(res.headers.get("x-oauth-scopes"));
}
