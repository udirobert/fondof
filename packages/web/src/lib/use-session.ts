"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchSession,
  loginWithGitHub,
  logout as logoutApi,
  setToken,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth";

interface UseSessionReturn {
  user: AuthUser | null;
  plan: "free" | "pro";
  forgesThisMonth: number;
  forgeLimit: number | null;
  loading: boolean;
  authError: string | null;
  login: (redirect?: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Reactive session hook.
 * On mount, checks for ?token= from OAuth callback and stores it,
 * then fetches the session from the API.
 */
export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await fetchSession();
    setSession(s);
    setLoading(false);
  }, []);

  // Capture token or auth_error from OAuth callback redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const tokenParam = url.searchParams.get("token");
    const errorParam = url.searchParams.get("auth_error");
    if (tokenParam) {
      setToken(tokenParam);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
    if (errorParam) {
      setAuthError(errorParam);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.toString());
      // Auto-dismiss after 8 seconds
      window.setTimeout(() => setAuthError(null), 8000);
    }
  }, []);

  // Load session on mount
  useEffect(() => {
    void load();
  }, [load]);

  const login = useCallback((redirect?: string) => {
    loginWithGitHub(redirect || window.location.pathname);
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setSession(null);
  }, []);

  return {
    user: session?.user ?? null,
    plan: session?.plan ?? "free",
    forgesThisMonth: session?.usage?.forgesThisMonth ?? 0,
    forgeLimit: session?.usage?.limit ?? 3,
    loading,
    authError,
    login,
    logout,
    refresh: load,
  };
}
