/**
 * CLI login — fondof-hosted device flow + optional GitHub-token exchange.
 *
 * Agents/CLIs cannot use the browser cookie + /auth/exchange path. This
 * issues the same KV session tokens the web app uses.
 */
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import type { Env } from "../index.js";
import { githubScopesForIntent } from "../lib/github-scopes.js";
import { rateLimit } from "../lib/rate-limit-mw.js";
import type { Session } from "./auth.js";
import { createSessionFromGitHubUser, generateAuthToken } from "./auth.js";

export const authCliRoute = new Hono<{ Bindings: Env }>();

const CLI_TTL = 60 * 15; // 15 minutes
const OAUTH_COOKIE = "fondof_oauth";

type CliDevicePending = {
  status: "pending";
  userCode: string;
  createdAt: number;
};

type CliDeviceReady = {
  status: "ready";
  userCode: string;
  createdAt: number;
  token: string;
  userId: number;
  login: string;
  avatarUrl: string;
  name: string | null;
};

type CliDeviceRecord = CliDevicePending | CliDeviceReady;

function normalizeUserCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function formatUserCode(raw: string): string {
  const n = normalizeUserCode(raw);
  if (n.length <= 4) return n;
  return `${n.slice(0, 4)}-${n.slice(4, 8)}`;
}

function oauthCookieOpts(frontendUrl: string) {
  const https = frontendUrl.startsWith("https:");
  return {
    path: "/api/auth",
    httpOnly: true,
    secure: https,
    sameSite: (https ? "None" : "Lax") as "None" | "Lax",
    maxAge: 60 * 10,
  };
}

/**
 * POST /auth/cli/start — begin a CLI device login.
 */
authCliRoute.post("/auth/cli/start", rateLimit("authCli"), async (c) => {
  const deviceCode = generateAuthToken();
  const userCode = formatUserCode(generateAuthToken().slice(0, 8));
  const normalized = normalizeUserCode(userCode);

  const record: CliDevicePending = {
    status: "pending",
    userCode,
    createdAt: Date.now(),
  };
  await c.env.SESSIONS.put(`cli-device:${deviceCode}`, JSON.stringify(record), {
    expirationTtl: CLI_TTL,
  });
  await c.env.SESSIONS.put(`cli-usercode:${normalized}`, deviceCode, {
    expirationTtl: CLI_TTL,
  });

  const base = new URL(c.req.url).origin;
  const verificationUri = `${base}/api/auth/cli/authorize?user_code=${encodeURIComponent(userCode)}`;

  return c.json({
    deviceCode,
    userCode,
    verificationUri,
    verificationUriComplete: verificationUri,
    expiresIn: CLI_TTL,
    interval: 3,
  });
});

/**
 * GET /auth/cli/authorize?user_code= — open in browser; starts GitHub OAuth
 * bound to the pending CLI device.
 */
authCliRoute.get("/auth/cli/authorize", async (c) => {
  const frontendUrl = c.env.FRONTEND_URL || "https://fondof.netlify.app";
  const userCodeRaw = c.req.query("user_code") || "";
  const normalized = normalizeUserCode(userCodeRaw);
  if (!normalized) {
    return c.html(cliPage("Missing code", "Open the link from your terminal again."), 400);
  }

  const deviceCode = await c.env.SESSIONS.get(`cli-usercode:${normalized}`);
  if (!deviceCode) {
    return c.html(
      cliPage("Code expired", "Run fondof login again in your terminal."),
      400,
    );
  }

  const raw = await c.env.SESSIONS.get(`cli-device:${deviceCode}`);
  if (!raw) {
    return c.html(
      cliPage("Code expired", "Run fondof login again in your terminal."),
      400,
    );
  }
  const device = JSON.parse(raw) as CliDeviceRecord;
  if (device.status !== "pending") {
    return c.html(
      cliPage("Already used", "Return to the terminal — login should finish shortly."),
      200,
    );
  }

  const state = generateAuthToken();
  const browserNonce = generateAuthToken();
  await c.env.SESSIONS.put(
    `oauth-state:${state}`,
    JSON.stringify({
      redirect: "/",
      browserNonce,
      cliDeviceCode: deviceCode,
    }),
    { expirationTtl: 60 * 10 },
  );
  setCookie(c, OAUTH_COOKIE, browserNonce, oauthCookieOpts(frontendUrl));

  const redirectUri = `${new URL(c.req.url).origin}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: githubScopesForIntent(undefined),
    state,
  });
  return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

/**
 * POST /auth/cli/poll — CLI waits until the browser OAuth completes.
 * Body: { deviceCode }
 */
authCliRoute.post("/auth/cli/poll", rateLimit("authCli"), async (c) => {
  const body = (await c.req.json<{ deviceCode?: string }>().catch(() => ({}))) as {
    deviceCode?: string;
  };
  const deviceCode = body.deviceCode?.trim();
  if (!deviceCode) return c.json({ error: "deviceCode is required" }, 400);

  const raw = await c.env.SESSIONS.get(`cli-device:${deviceCode}`);
  if (!raw) {
    return c.json({ status: "expired", error: "Device code expired" }, 400);
  }

  const device = JSON.parse(raw) as CliDeviceRecord;
  if (device.status === "pending") {
    return c.json({ status: "pending" });
  }

  // One-time consume
  await c.env.SESSIONS.delete(`cli-device:${deviceCode}`);
  await c.env.SESSIONS.delete(
    `cli-usercode:${normalizeUserCode(device.userCode)}`,
  );

  return c.json({
    status: "ready",
    token: device.token,
    user: {
      id: device.userId,
      login: device.login,
      avatarUrl: device.avatarUrl,
      name: device.name,
    },
  });
});

/**
 * POST /auth/cli/github — exchange a GitHub access token for a fondof session.
 * Useful when `fondof connect` already stored a GitHub token.
 */
authCliRoute.post("/auth/cli/github", rateLimit("authCli"), async (c) => {
  const body = (await c.req
    .json<{ accessToken?: string; githubToken?: string }>()
    .catch(() => ({}))) as { accessToken?: string; githubToken?: string };
  const accessToken = (body.accessToken || body.githubToken || "").trim();
  if (!accessToken) {
    return c.json({ error: "accessToken is required" }, 400);
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "fondof-api",
    },
  });
  if (!userRes.ok) {
    return c.json({ error: "Invalid GitHub token" }, 401);
  }

  const user = (await userRes.json()) as {
    id: number;
    login: string;
    avatar_url: string;
    name: string | null;
  };

  const { token, session } = await createSessionFromGitHubUser(c.env, {
    userId: user.id,
    login: user.login,
    avatarUrl: user.avatar_url,
    name: user.name,
    accessToken,
  });

  return c.json({
    token,
    user: {
      id: session.userId,
      login: session.login,
      avatarUrl: session.avatarUrl,
      name: session.name,
    },
  });
});

/** Complete a CLI device after the main OAuth callback creates a session. */
export async function completeCliDeviceLogin(
  env: Env,
  deviceCode: string,
  sessionToken: string,
  session: Session,
): Promise<void> {
  const raw = await env.SESSIONS.get(`cli-device:${deviceCode}`);
  if (!raw) return;
  const prev = JSON.parse(raw) as CliDeviceRecord;
  const ready: CliDeviceReady = {
    status: "ready",
    userCode: prev.userCode,
    createdAt: prev.createdAt,
    token: sessionToken,
    userId: session.userId,
    login: session.login,
    avatarUrl: session.avatarUrl,
    name: session.name,
  };
  await env.SESSIONS.put(`cli-device:${deviceCode}`, JSON.stringify(ready), {
    expirationTtl: CLI_TTL,
  });
}

function cliPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} · fondof</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;background:#f7f4ef;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  main{max-width:28rem;padding:2rem;text-align:center}
  h1{font-size:1.25rem;margin:0 0 .5rem}
  p{color:#5c5c5c;margin:0;line-height:1.5}
</style></head>
<body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;
}

export function cliSuccessHtml(login: string): string {
  const safe = login.replace(/[<>&"']/g, "");
  return cliPage(
    "Signed in",
    `You're signed in to fondof as <strong>${safe}</strong>. Return to the terminal.`,
  );
}
