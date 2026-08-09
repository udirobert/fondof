"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Zap } from "lucide-react";
import { checkForge, getCheckoutUrl, type ForgeCheck } from "@/lib/billing";
import { useSession } from "@/lib/use-session";

interface ForgeLimitGateProps {
  /** Called when forge is allowed — parent should proceed with forge. */
  onAllowed: () => void;
  /** Whether the gate check should run (e.g. when forge button is clicked). */
  active: boolean;
}

/**
 * Gate component that checks forge limits before allowing a forge.
 * Shows upgrade CTA when the free tier limit is reached.
 * Renders nothing when the user has forges remaining.
 */
export function ForgeLimitGate({ onAllowed, active }: ForgeLimitGateProps) {
  const { user, login } = useSession();
  const [check, setCheck] = useState<ForgeCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!active) {
      setCheck(null);
      return;
    }
    setChecking(true);
    checkForge().then((result) => {
      setCheck(result);
      setChecking(false);
      if (result.allowed) onAllowed();
    });
  }, [active, onAllowed]);

  const handleUpgrade = useCallback(async () => {
    if (!user) {
      login();
      return;
    }
    setUpgrading(true);
    const url = await getCheckoutUrl();
    if (url) {
      window.location.href = url;
    } else {
      setUpgrading(false);
    }
  }, [user, login]);

  // Still checking or allowed — render nothing
  if (checking || !check || check.allowed) return null;

  // Limit reached — show upgrade CTA
  return (
    <div className="rounded-xl border border-ember/20 bg-ember/5 p-4 text-center">
      <div className="flex items-center justify-center gap-2 text-ember">
        <Zap size={16} />
        <span className="font-medium text-sm">Free forges used this month</span>
      </div>
      <p className="mt-2 text-[12px] text-foreground-secondary">
        You've used all 3 free forges. Upgrade to Pro for unlimited forging.
      </p>
      <button
        type="button"
        onClick={() => void handleUpgrade()}
        disabled={upgrading}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ember px-4 py-2 text-sm font-medium text-paper hover:bg-ember-hot disabled:opacity-50"
      >
        <Sparkles size={14} />
        {upgrading ? "Redirecting…" : "Upgrade to Pro"}
      </button>
      {!user && (
        <p className="mt-2 text-[11px] text-muted">
          Sign in first to upgrade your account
        </p>
      )}
    </div>
  );
}
