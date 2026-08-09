"use client";

import { useSession } from "@/lib/use-session";
import { LogIn, LogOut } from "lucide-react";

interface AuthButtonProps {
  variant?: "nav" | "inline";
}

/**
 * Auth button — shows login or user avatar + logout.
 * Lightweight alternative to the wallet button for general audiences.
 */
export function AuthButton({ variant = "nav" }: AuthButtonProps) {
  const { user, loading, login, logout } = useSession();

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
    <button
      type="button"
      onClick={() => login()}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-ember/35 hover:text-ink"
    >
      <LogIn size={12} />
      Sign in
    </button>
  );
}
