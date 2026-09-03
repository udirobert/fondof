import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env } from "../index.js";
import { inspectForgeEntitlement } from "../lib/forge-quota.js";
import { githubScopesForIntent } from "../lib/github-scopes.js";
import {
  peekOAuthExchange,
  storeOAuthExchange,
  takeOAuthExchange,
} from "../lib/oauth-exchange.js";
import { postLoginUrl, safeAppPath } from "../lib/oauth-redirect.js";
import { isResolverLogin } from "../lib/relayer-guard.js";

export const authRoute = new Hono<{ Bindings: Env }>();

/** Session stored in KV — keyed by random token. TTL 30 days. */
export interface Session {
  userId: number;
  login: string;
  avatarUrl: string;
  name: string | null;
  accessToken: string;
  createdAt: number;
}

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const STATE_TTL = 60 * 10; // OAuth state nonce: 10 minutes
const EXCHANGE_TTL = 60; // One-time token exchange code: 60 seconds
const OAUTH_COOKIE = "fondof_oauth";
const SESSION_COOKIE = "fondof_session";

function generateToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Shared by web OAuth and CLI login. */
export function generateAuthToken(): string {
  return generateToken();
}

export async function createSessionFromGitHubUser(
  env: Env,
  input: {
    userId: number;
    login: string;
    avatarUrl: string;
    name: string | null;
    accessToken: string;
  },
): Promise<{ token: string; session: Session }> {
  const token = generateToken();
  const session: Session = {
    userId: input.userId,
    login: input.login,
    avatarUrl: input.avatarUrl,
    name: input.name,
    accessToken: input.accessToken,
    createdAt: Date.now(),
  };

  await env.SESSIONS.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: SESSION_TTL,
  });
  await env.SESSIONS.put(`login-to-id:${input.login}`, String(input.userId), {
    expirationTtl: SESSION_TTL,
  });

  return { token, session };
}

function frontendOrigin(frontendUrl: string): string {
  return new URL(frontendUrl).origin;
}

function oauthCookieOpts(frontendUrl: string) {
  const https = frontendUrl.startsWith("https:");
  return {
    path: "/api/auth",
    httpOnly: true,
    secure: https,
    sameSite: (https ? "None" : "Lax") as "None" | "Lax",
    maxAge: STATE_TTL,
  };
}

function sessionCookieOpts(frontendUrl: string) {
  const https = frontendUrl.startsWith("https:");
  return {
    path: "/api",
    httpOnly: true,
    secure: https,
    sameSite: (https ? "None" : "Lax") as "None" | "Lax",
    maxAge: SESSION_TTL,
  };
}

/**
 * GET /auth/github — redirect user to GitHub OAuth consent screen.
 * Query params: ?redirect= (optional post-login path for the frontend).
 * Optional ?intent=publish requests gist + repo scopes incrementally so
 * GitHub publish can succeed after a profile-only sign-in.
 * Only relative application paths are stored; absolute URLs are dropped.
 *
 * The state param is a random nonce stored server-side (one-time, 10 min TTL)
 * so the callback can verify the flow was initiated by this app — CSRF-safe.
 * A SameSite cookie binds the later code exchange to this browser.
 */
authRoute.get("/auth/github", async (c) => {
  const frontendUrl = c.env.FRONTEND_URL || "https://fondof.netlify.app";
  const redirect = safeAppPath(c.req.query("redirect"));
  const state = generateToken();
  const browserNonce = generateToken();
  await c.env.SESSIONS.put(
    `oauth-state:${state}`,
    JSON.stringify({ redirect, browserNonce }),
    { expirationTtl: STATE_TTL },
  );
  setCookie(c, OAUTH_COOKIE, browserNonce, oauthCookieOpts(frontendUrl));
  const params = new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID,
    redirect_uri: `${c.req.url.split("/api/auth/github")[0]}/api/auth/callback`,
    scope: githubScopesForIntent(c.req.query("intent")),
    state,
  });
  return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

/**
 * GET /auth/callback — GitHub redirects here with ?code=&state=.
 * Exchanges code for access token, fetches user profile, creates session.
 */
authRoute.get("/auth/callback", async (c) => {
  const frontendUrl = c.env.FRONTEND_URL || "https://fondof.netlify.app";
  const code = c.req.query("code");
  const error = c.req.query("error");

  // GitHub returned an error (user denied, or other issue)
  if (error || !code) {
    const desc = c.req.query("error_description") || "GitHub sign-in was cancelled or failed. Make sure you're logged into GitHub, then try again.";
    const url = new URL("/", frontendUrl);
    url.searchParams.set("auth_error", desc);
    return c.redirect(url.toString());
  }

  const stateRaw = c.req.query("state") || "";
  // Verify the one-time state nonce; reject the flow if it is missing,
  // already consumed, or expired (CSRF protection).
  const stateRawStored = await c.env.SESSIONS.get(`oauth-state:${stateRaw}`);
  if (!stateRawStored) {
    const url = new URL("/", frontendUrl);
    url.searchParams.set(
      "auth_error",
      "Sign-in session expired or was not started here. Please try again.",
    );
    return c.redirect(url.toString());
  }
  await c.env.SESSIONS.delete(`oauth-state:${stateRaw}`);
  let redirect = "/";
  let browserNonce = "";
  let cliDeviceCode = "";
  try {
    const parsed = JSON.parse(stateRawStored) as {
      redirect?: string;
      browserNonce?: string;
      cliDeviceCode?: string;
    };
    redirect = safeAppPath(parsed.redirect);
    browserNonce = parsed.browserNonce?.trim() || "";
    cliDeviceCode = parsed.cliDeviceCode?.trim() || "";
  } catch {
    // ignore bad state payload
  }

  const cookieNonce = getCookie(c, OAUTH_COOKIE);
  // CLI authorize sets the cookie in the same browser; require the match.
  if (!browserNonce || cookieNonce !== browserNonce) {
    const url = new URL("/", frontendUrl);
    url.searchParams.set(
      "auth_error",
      "Sign-in session expired or was not started here. Please try again.",
    );
    return c.redirect(url.toString());
  }
  setCookie(c, OAUTH_COOKIE, browserNonce, oauthCookieOpts(frontendUrl));

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenData.access_token) {
    const url = new URL("/", frontendUrl);
    url.searchParams.set("auth_error", tokenData.error_description || "GitHub authentication failed. Please try again.");
    return c.redirect(url.toString());
  }

  // Fetch user profile
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "fondof-api",
    },
  });

  if (!userRes.ok) {
    const url = new URL("/", frontendUrl);
    url.searchParams.set("auth_error", "Couldn't fetch your GitHub profile. Please try again.");
    return c.redirect(url.toString());
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
    accessToken: tokenData.access_token,
  });

  // CLI device login — hand the session to the waiting terminal, skip web exchange.
  if (cliDeviceCode) {
    const { completeCliDeviceLogin, cliSuccessHtml } = await import(
      "./auth-cli.js"
    );
    await completeCliDeviceLogin(c.env, cliDeviceCode, token, session);
    deleteCookie(c, OAUTH_COOKIE, { path: "/api/auth" });
    return c.html(cliSuccessHtml(session.login));
  }

  // Redirect back with a short-lived one-time exchange code instead of the
  // session token itself — the token never appears in a URL (no history,
  // referrer, or log leakage). The frontend swaps the code for the token.
  const exchangeCode = generateToken();
  await storeOAuthExchange(
    c.env,
    exchangeCode,
    { token, browserNonce },
    EXCHANGE_TTL,
  );
  const url = postLoginUrl(frontendUrl, redirect);
  url.searchParams.set("code", exchangeCode);
  return c.redirect(url.toString());
});

/**
 * POST /auth/exchange — swap a one-time OAuth code for the session token.
 * The code is single-use, expires in 60 seconds, and is bound to the
 * initiating browser via an HttpOnly cookie plus the frontend Origin.
 */
authRoute.post("/auth/exchange", async (c) => {
  const frontendUrl = c.env.FRONTEND_URL || "https://fondof.netlify.app";
  const allowedOrigin = frontendOrigin(frontendUrl);
  const origin = c.req.header("Origin");
  if (origin && origin !== allowedOrigin) {
    return c.json({ error: "Code expired or already used" }, 401);
  }

  const body = (await c.req.json<{ code?: string }>().catch(() => ({}))) as {
    code?: string;
  };
  const code = body.code?.trim();
  if (!code) return c.json({ error: "code is required" }, 400);

  const peeked = await peekOAuthExchange(c.env, code);
  if (!peeked) return c.json({ error: "Code expired or already used" }, 401);

  const token = peeked.token?.trim() || "";
  const browserNonce = peeked.browserNonce?.trim() || "";

  const cookieNonce = getCookie(c, OAUTH_COOKIE);
  if (cookieNonce && cookieNonce !== browserNonce) {
    return c.json({ error: "Code expired or already used" }, 401);
  }
  const boundToBrowser = Boolean(browserNonce) && cookieNonce === browserNonce;
  const boundToFrontend = origin === allowedOrigin;
  if (!token || !browserNonce || (!boundToBrowser && !boundToFrontend)) {
    return c.json({ error: "Code expired or already used" }, 401);
  }

  const taken = await takeOAuthExchange(c.env, code);
  if (!taken?.token) {
    return c.json({ error: "Code expired or already used" }, 401);
  }
  deleteCookie(c, OAUTH_COOKIE, { path: "/api/auth" });
  // Keep the token out of the response body; browsers only get it via
  // the httpOnly cookie, so a future XSS cannot exfiltrate it.
  setCookie(c, SESSION_COOKIE, taken.token, sessionCookieOpts(frontendUrl));
  return c.json({ ok: true });
});

/**
 * GET /auth/me — returns current user session (if valid).
 * Expects Authorization: Bearer <token> header.
 */
authRoute.get("/auth/me", async (c) => {
  const session = await resolveSession(c);
  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  const entitlement = await inspectForgeEntitlement(
    c.env,
    session,
    "signed-in",
  );

  return c.json({
    authenticated: true,
    user: {
      id: session.userId,
      login: session.login,
      avatarUrl: session.avatarUrl,
      name: session.name,
    },
    plan: entitlement.plan,
    resolver: isResolverLogin(session.login, c.env.RESOLVER_LOGINS),
    usage: {
      forgesThisMonth:
        entitlement.limit === null
          ? 0
          : entitlement.limit - (entitlement.remaining ?? 0),
      limit: entitlement.limit,
      remaining: entitlement.remaining,
    },
  });
});

/**
 * POST /auth/logout — invalidates the session.
 */
authRoute.post("/auth/logout", async (c) => {
  const session = await resolveSession(c);
  if (session) {
    const token = getTokenFromContext(c);
    if (token) {
      await c.env.SESSIONS.delete(`session:${token}`);
    }
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/api" });
  return c.json({ ok: true });
});

/** Returns YYYY-MM string for the current billing period. */
export { billingMonth } from "../lib/forge-quota.js";

/**
 * Helper: resolve session from cookie (preferred) or Authorization header.
 * Returns null if unauthenticated.
 */
function getTokenFromContext(c: Context<{ Bindings: Env }>): string | null {
  const auth = c.req.header("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = getCookie(c, SESSION_COOKIE);
  if (cookie) return cookie;
  return null;
}

async function resolveByToken(
  token: string | null,
  kv: KVNamespace,
): Promise<Session | null> {
  if (!token) return null;
  const raw = await kv.get(`session:${token}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

/**
 * Resolve a session from the current request context.
 * The web sends the session token as an httpOnly cookie; CLI/agents may
 * still use the Authorization header.
 */
export async function resolveSession(
  c: Context<{ Bindings: Env }>,
): Promise<Session | null> {
  const token = getTokenFromContext(c);
  return resolveByToken(token, c.env.SESSIONS);
}
