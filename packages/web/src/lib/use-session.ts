"use client";

import { useCallback, useEffect, useState } from "react";
import {
  exchangeAuthCode,
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

  // Capture the one-time OAuth code (or auth_error) from the callback
  // redirect, exchange the code for a token, then clean the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const codeParam = url.searchParams.get("code");
    const errorParam = url.searchParams.get("auth_error");
    if (codeParam) {
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());
      void exchangeAuthCode(codeParam).then((token) => {
        if (token) {
          setToken(token);
          void load();
        }
      });
    }
    if (errorParam) {
      setAuthError(errorParam);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.toString());
      // Auto-dismiss after 8 seconds
      window.setTimeout(() => setAuthError(null), 8000);
    }
  }, [load]);

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
