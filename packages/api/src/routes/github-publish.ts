import { Hono } from "hono";
import type { Context } from "hono";
import type { Env } from "../index.js";
import { resolveSession } from "./auth.js";
import {
  missingGitHubPublishScopes,
  readGitHubOAuthScopes,
  type GitHubPublishKind,
} from "../lib/github-scopes.js";

export const githubPublishRoute = new Hono<{ Bindings: Env }>();

/**
 * POST /publish/github — publish a skill to GitHub as a gist or repo file.
 * Uses the user's GitHub access token from their session.
 *
 * Body: { markdown, title, repo?, path? }
 * - If repo is provided, creates/updates a file in that repo.
 * - Otherwise creates a public gist.
 */
githubPublishRoute.post("/publish/github", async (c) => {
  const session = await resolveSession(c);

  if (!session) {
    return c.json({ error: "Sign in with GitHub to publish" }, 401);
  }

  const body = await c.req.json<{
    markdown: string;
    title: string;
    skillHash?: string;
    repo?: string; // "owner/repo"
    path?: string; // e.g. ".kiro/steering/my-skill.md"
    private?: boolean;
  }>();

  if (!body.markdown || !body.title) {
    return c.json({ error: "markdown and title required" }, 400);
  }

  const isPrivate = body.private === true;
  const filename = toFilename(body.title);
  const kind: GitHubPublishKind = body.repo ? "repo" : "gist";
  const granted = await readGitHubOAuthScopes(session.accessToken);
  const missing = missingGitHubPublishScopes(granted, kind);
  if (missing.length) {
    return githubScopeRequired(c, missing);
  }

  // Default: create a public gist
  if (!body.repo) {
    const gistRes = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "fondof-api",
      },
      body: JSON.stringify({
        description: `${body.title} — Forged with fondof`,
        public: true,
        files: {
          [filename]: { content: body.markdown },
        },
      }),
    });

    if (!gistRes.ok) {
      const err = await gistRes.text();
      if (gistRes.status === 403 || gistRes.status === 401) {
        return githubScopeRequired(c, ["gist"], err);
      }
      return c.json(
        { error: "GitHub API error", detail: err.slice(0, 200) },
        502,
      );
    }

    const gist = (await gistRes.json()) as { html_url: string; id: string };

    // Store in user's published skills (skip if private)
    if (body.skillHash && !isPrivate) {
      await storePublishedSkill(c.env.SESSIONS, session.userId, {
        skillHash: body.skillHash,
        title: body.title,
        githubUrl: gist.html_url,
        type: "gist",
        publishedAt: Date.now(),
      });
    }

    return c.json({ url: gist.html_url, type: "gist" });
  }

  // Push to a repo file
  const filePath = body.path || `.kiro/steering/${filename}`;
  const [owner, repo] = body.repo.split("/");

  if (!owner || !repo) {
    return c.json({ error: "repo must be owner/repo format" }, 400);
  }

  // Check if file exists (to get sha for update)
  const existingRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "fondof-api",
      },
    },
  );

  const existingSha =
    existingRes.ok
      ? ((await existingRes.json()) as { sha?: string }).sha
      : undefined;

  // Create or update file
  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "fondof-api",
      },
      body: JSON.stringify({
        message: `Add skill: ${body.title}\n\nForged with fondof`,
        content: btoa(unescape(encodeURIComponent(body.markdown))),
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    },
  );

  if (!putRes.ok) {
    const err = await putRes.text();
    if (putRes.status === 403 || putRes.status === 401) {
      return githubScopeRequired(c, ["repo"], err);
    }
    return c.json(
      { error: "GitHub API error", detail: err.slice(0, 200) },
      502,
    );
  }

  const result = (await putRes.json()) as {
    content: { html_url: string };
  };

  if (body.skillHash && !isPrivate) {
    await storePublishedSkill(c.env.SESSIONS, session.userId, {
      skillHash: body.skillHash,
      title: body.title,
      githubUrl: result.content.html_url,
      type: "repo",
      repo: body.repo,
      path: filePath,
      publishedAt: Date.now(),
    });
  }

  return c.json({ url: result.content.html_url, type: "repo", path: filePath });
});

/**
 * GET /publish/github/skills/:login — list a user's published skills.
 * Used by the portfolio page.
 */
githubPublishRoute.get("/publish/github/skills/:login", async (c) => {
  const login = c.req.param("login");
  if (!login) return c.json({ skills: [] });

  // Look up userId by login
  const userIdRaw = await c.env.SESSIONS.get(`login-to-id:${login}`);
  if (!userIdRaw) return c.json({ skills: [] });

  const userId = parseInt(userIdRaw, 10);
  const skills = await getPublishedSkills(c.env.SESSIONS, userId);
  return c.json({ skills, login });
});

// --- Helpers ---

interface PublishedSkill {
  skillHash: string;
  title: string;
  githubUrl: string;
  type: "gist" | "repo";
  repo?: string;
  path?: string;
  publishedAt: number;
}

async function storePublishedSkill(
  kv: KVNamespace,
  userId: number,
  skill: PublishedSkill,
): Promise<void> {
  const key = `published:${userId}`;
  const existing = (await kv.get(key, "json")) as PublishedSkill[] | null;
  const skills = existing || [];

  // Avoid duplicates
  if (!skills.some((s) => s.skillHash === skill.skillHash)) {
    skills.push(skill);
    await kv.put(key, JSON.stringify(skills), {
      expirationTtl: 60 * 60 * 24 * 365,
    });
  }
}

async function getPublishedSkills(
  kv: KVNamespace,
  userId: number,
): Promise<PublishedSkill[]> {
  const key = `published:${userId}`;
  return ((await kv.get(key, "json")) as PublishedSkill[] | null) || [];
}

function githubScopeRequired(
  c: Context<{ Bindings: Env }>,
  missing: string[],
  detail?: string,
) {
  const origin = c.req.url.split("/api/publish/github")[0];
  return c.json(
    {
      error:
        "GitHub has not granted permission to publish. Authorize the extra scopes, then retry.",
      code: "github_scope_required",
      missing,
      authorizeUrl: `${origin}/api/auth/github?intent=publish`,
      ...(detail ? { detail: detail.slice(0, 200) } : {}),
    },
    403,
  );
}

function toFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) + ".md"
  );
}
