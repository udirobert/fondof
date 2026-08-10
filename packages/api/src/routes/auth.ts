import { Hono } from "hono";
import type { Env } from "../index.js";

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

function generateToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * GET /auth/github — redirect user to GitHub OAuth consent screen.
 * Query params: ?redirect= (optional post-login redirect for the frontend)
 */
authRoute.get("/auth/github", (c) => {
  const redirect = c.req.query("redirect") || "/";
  const state = btoa(JSON.stringify({ redirect }));
  const params = new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID,
    redirect_uri: `${c.req.url.split("/api/auth/github")[0]}/api/auth/callback`,
    scope: "read:user",
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
  let redirect = "/";
  try {
    const parsed = JSON.parse(atob(stateRaw));
    if (parsed.redirect) redirect = parsed.redirect;
  } catch {
    // ignore bad state
  }

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

  // Create session
  const token = generateToken();
  const session: Session = {
    userId: user.id,
    login: user.login,
    avatarUrl: user.avatar_url,
    name: user.name,
    accessToken: tokenData.access_token,
    createdAt: Date.now(),
  };

  await c.env.SESSIONS.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: SESSION_TTL,
  });

  // Map login → userId for portfolio lookups
  await c.env.SESSIONS.put(`login-to-id:${user.login}`, String(user.id), {
    expirationTtl: SESSION_TTL,
  });

  // Redirect back to frontend with token as query param (frontend stores it)
  const url = new URL(redirect, frontendUrl);
  url.searchParams.set("token", token);
  return c.redirect(url.toString());
});

/**
 * GET /auth/me — returns current user session (if valid).
 * Expects Authorization: Bearer <token> header.
 */
authRoute.get("/auth/me", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ authenticated: false }, 401);
  }

  const token = auth.slice(7);
  const raw = await c.env.SESSIONS.get(`session:${token}`);
  if (!raw) {
    return c.json({ authenticated: false }, 401);
  }

  const session: Session = JSON.parse(raw);

  // Also return usage info for the current billing period
  const usageKey = `usage:${session.userId}:${billingMonth()}`;
  const usageRaw = await c.env.SESSIONS.get(usageKey);
  const forgeCount = usageRaw ? parseInt(usageRaw, 10) : 0;

  const planRaw = await c.env.SESSIONS.get(`plan:${session.userId}`);
  const plan = planRaw || "free";

  return c.json({
    authenticated: true,
    user: {
      id: session.userId,
      login: session.login,
      avatarUrl: session.avatarUrl,
      name: session.name,
    },
    plan,
    usage: {
      forgesThisMonth: forgeCount,
      limit: plan === "pro" ? null : 3,
    },
  });
});

/**
 * POST /auth/logout — invalidates the session.
 */
authRoute.post("/auth/logout", async (c) => {
  const auth = c.req.header("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    await c.env.SESSIONS.delete(`session:${token}`);
  }
  return c.json({ ok: true });
});

/** Returns YYYY-MM string for the current billing period. */
export function billingMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Helper: resolve session from Authorization header.
 * Returns null if unauthenticated.
 */
export async function resolveSession(
  authHeader: string | undefined,
  kv: KVNamespace,
): Promise<Session | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const raw = await kv.get(`session:${token}`);
  if (!raw) return null;
  return JSON.parse(raw) as Session;
}
