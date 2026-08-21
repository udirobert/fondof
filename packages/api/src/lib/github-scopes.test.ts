import { describe, expect, it } from "vitest";
import {
  GITHUB_PUBLISH_SCOPES,
  GITHUB_SIGN_IN_SCOPES,
  githubScopesForIntent,
  missingGitHubPublishScopes,
  parseOAuthScopes,
} from "./github-scopes.js";

describe("github OAuth scopes", () => {
  it("keeps sign-in to profile-read and asks for publish scopes incrementally", () => {
    expect(githubScopesForIntent(undefined)).toBe(GITHUB_SIGN_IN_SCOPES);
    expect(githubScopesForIntent("publish")).toBe(GITHUB_PUBLISH_SCOPES);
    expect(GITHUB_SIGN_IN_SCOPES).toBe("read:user");
    expect(GITHUB_PUBLISH_SCOPES).toContain("gist");
    expect(GITHUB_PUBLISH_SCOPES).toContain("repo");
  });

  it("requires gist for gist publish and repo or public_repo for repo publish", () => {
    expect(missingGitHubPublishScopes(parseOAuthScopes("read:user"), "gist")).toEqual([
      "gist",
    ]);
    expect(
      missingGitHubPublishScopes(parseOAuthScopes("read:user, gist"), "gist"),
    ).toEqual([]);
    expect(
      missingGitHubPublishScopes(parseOAuthScopes("read:user, gist"), "repo"),
    ).toEqual(["repo"]);
    expect(
      missingGitHubPublishScopes(
        parseOAuthScopes("read:user, gist, public_repo"),
        "repo",
      ),
    ).toEqual([]);
  });
});
