"use client";

/* GitHub returns external avatar URLs; user accounts are not a fixed image domain. */
/* eslint-disable @next/next/no-img-element */

import { useSession } from "@/lib/use-session";
import { LogOut } from "lucide-react";

interface AuthButtonProps {
  variant?: "nav" | "inline";
}

/** Simple GitHub mark — avoids lucide's missing Github icon. */
function GitHubMark({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/**
 * Auth button — shows login or user avatar + logout.
 * Explicitly branded as GitHub to set user expectations.
 */
export function AuthButton({ variant = "nav" }: AuthButtonProps) {
  const { user, loading, login, logout, authError } = useSession();

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-1.5">
        <img
          src={user.avatarUrl}
          alt={user.login}
          className="h-6 w-6 rounded-full"
        />
        {variant === "inline" && (
          <span className="text-xs font-medium text-ink">{user.login}</span>
        )}
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] text-muted hover:text-ink"
          title="Log out"
        >
          <LogOut size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => login()}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-ember/35 hover:text-ink"
        title="Sign in with your GitHub account"
      >
        <GitHubMark size={13} />
        GitHub
      </button>
      {authError && (
        <p className="absolute top-full right-0 z-50 mt-1 w-64 rounded-lg border border-ink/10 bg-paper px-3 py-2 text-[11px] leading-snug text-ember shadow-[var(--shadow-float)]">
          {authError}
        </p>
      )}
    </div>
  );
}
