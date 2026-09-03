/**
 * Auth client — talks to the fondof API /auth/* endpoints.
 * Session token is now stored in an httpOnly cookie set by the API;
 * this file no longer touches localStorage.
 */

import { API_BASE } from "@/lib/api-base";

export interface AuthUser {
  id: number;
  login: string;
  avatarUrl: string;
  name: string | null;
}

export interface AuthSession {
  authenticated: boolean;
  user: AuthUser | null;
  plan: "free" | "pro" | "sharer";
  resolver?: boolean;
  usage: {
    forgesThisMonth: number;
    limit: number | null;
  } | null;
}

/** Redirect to GitHub OAuth via the API. */
export function loginWithGitHub(
  redirect?: string,
  opts?: { intent?: "publish" },
): void {
  const params = new URLSearchParams();
  const path = safeClientRedirect(redirect);
  if (path && path !== "/") params.set("redirect", path);
  if (opts?.intent === "publish") params.set("intent", "publish");
  // OAuth must leave the app and may target a separately hosted API.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `${API_BASE}/api/auth/github?${params}`;
}

/** Only relative app paths — the API also enforces this. */
function safeClientRedirect(redirect?: string): string {
  const candidate =
    redirect ||
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/");
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("://") ||
    candidate.includes("\\")
  ) {
    return "/";
  }
  return candidate.slice(0, 512);
}

/**
 * Exchange a one-time OAuth code (from the callback redirect) for a session.
 * The API sets the httpOnly cookie; we just report success.
 */
export async function exchangeAuthCode(
  code: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean };
    return data.ok ?? false;
  } catch {
    return false;
  }
}

/** Fetch current session from the API. Returns null if not authenticated. */
export async function fetchSession(): Promise<AuthSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as AuthSession;
  } catch {
    return null;
  }
}

/** Logout — invalidates session on API and clears the httpOnly cookie. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  }
}
