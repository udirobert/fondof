/**
 * Auth client — talks to the fondof API /auth/* endpoints.
 * Stores session token in localStorage; exposes reactive hook via Zustand.
 */

import { API_BASE } from "@/lib/api-base";

const TOKEN_KEY = "fondof_token";

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

/** Get stored token (if any). */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Store token after OAuth callback. */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Clear stored token. */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Redirect to GitHub OAuth via the API. */
export function loginWithGitHub(redirect?: string): void {
  const params = new URLSearchParams();
  if (redirect) params.set("redirect", redirect);
  // OAuth must leave the app and may target a separately hosted API.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `${API_BASE}/api/auth/github?${params}`;
}

/**
 * Exchange a one-time OAuth code (from the callback redirect) for the session
 * token. The code is single-use and short-lived; the token itself never
 * appears in a URL.
 */
export async function exchangeAuthCode(
  code: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}

/** Fetch current session from the API. Returns null if not authenticated. */
export async function fetchSession(): Promise<AuthSession | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) clearToken();
      return null;
    }
    return (await res.json()) as AuthSession;
  } catch {
    return null;
  }
}

/** Logout — invalidate session on API and clear local token. */
export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  clearToken();
}
