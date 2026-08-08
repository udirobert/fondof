"use client";

import { useEffect, useState } from "react";
import {
  useConnect,
  useConnection,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { Wallet } from "lucide-react";
import { IdentityLabel } from "@/components/identity-label";
import { monadTestnet } from "@/lib/monad-chain";

interface WalletButtonProps {
  variant?: "nav" | "panel";
}

function hasInjectedProvider() {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

/** Optional Monad wallet — never gates ingest. */
export function WalletButton({ variant = "nav" }: WalletButtonProps) {
  const { address, isConnected, chainId } = useConnection();
  const { connectAsync, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const wrongChain = isConnected && chainId !== monadTestnet.id;
  const connector =
    connectors.find((c) => c.id === "injected") ?? connectors[0];

  const onConnect = async () => {
    setLocalError(null);
    reset();

    if (!hasInjectedProvider()) {
      setLocalError("Install MetaMask (or another browser wallet), then retry.");
      return;
    }
    if (!connector) {
      setLocalError("Wallet connector not ready — refresh and try again.");
      return;
    }

    try {
      await connectAsync({
        connector,
        chainId: monadTestnet.id,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn’t connect";
      if (/reject|denied|cancel/i.test(msg)) {
        setLocalError("Connection rejected in wallet.");
      } else if (/provider|not found|no.*wallet/i.test(msg)) {
        setLocalError("No wallet found — install MetaMask and refresh.");
      } else {
        setLocalError(msg.slice(0, 120));
      }
    }
  };

  const errText = localError || error?.message || null;

  if (variant === "panel") {
    if (!isConnected) {
      return (
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={isPending || !mounted}
            onClick={() => void onConnect()}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink transition-colors hover:border-ember/35 disabled:opacity-40"
          >
            <Wallet size={14} />
            {isPending ? "Connecting…" : "Forge as you (optional)"}
          </button>
          <p className="px-1 font-mono text-[10px] tracking-wide text-muted">
            Skip → relayer publishes for the demo
          </p>
          {errText && (
            <p className="px-1 text-[11px] text-ember">{errText}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1.5 rounded-xl border border-ink/8 bg-paper/80 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate font-mono text-sm text-ink">
            Forger{" "}
            <IdentityLabel address={address!} avatar className="font-mono" />
          </p>
          <button
            type="button"
            onClick={() => disconnect()}
            className="shrink-0 text-[11px] text-muted hover:text-ink"
          >
            Disconnect
          </button>
        </div>
        {wrongChain ? (
          <button
            type="button"
            disabled={switching}
            onClick={() => switchChain({ chainId: monadTestnet.id })}
            className="w-full rounded-full bg-ember/15 px-3 py-1.5 text-xs font-medium text-ember"
          >
            {switching ? "Switching…" : "Switch to Monad Testnet"}
          </button>
        ) : (
          <p className="font-mono text-[10px] text-muted">
            Publish & challenge sign from this address
          </p>
        )}
      </div>
    );
  }

  // nav
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-1.5">
        {wrongChain && (
          <button
            type="button"
            disabled={switching}
            onClick={() => switchChain({ chainId: monadTestnet.id })}
            className="hidden rounded-full bg-ember/12 px-2 py-1 text-[10px] font-medium text-ember sm:inline"
          >
            Monad
          </button>
        )}
        <button
          type="button"
          onClick={() => disconnect()}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-2.5 py-1 font-mono text-[11px] text-ink transition-colors hover:border-ember/35"
          title="Disconnect — publish falls back to relayer"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${wrongChain ? "bg-ember" : "bg-steel"}`}
          />
          <IdentityLabel address={address} className="max-w-[7rem]" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isPending || !mounted}
        onClick={() => void onConnect()}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-ember/35 hover:text-ink disabled:opacity-40"
        title="Connect wallet to forge as yourself — else relayer publishes"
      >
        <Wallet size={12} />
        {isPending ? "…" : "Forger"}
      </button>
      {errText && (
        <p className="absolute top-full right-0 z-50 mt-1 w-56 rounded-lg border border-ink/10 bg-paper px-2.5 py-1.5 text-[10px] leading-snug text-ember shadow-[var(--shadow-float)]">
          {errText}
        </p>
      )}
    </div>
  );
}

declare global {
  interface Window {
    ethereum?: unknown;
  }
}
