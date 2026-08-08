"use client";

import {
  useConnect,
  useConnection,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { Wallet } from "lucide-react";
import { monadTestnet, shortAddress } from "@/lib/monad-chain";

interface WalletButtonProps {
  /** Compact for nav; fuller for forge panel */
  variant?: "nav" | "panel";
}

/**
 * Optional Monad wallet — never gates ingest/forge.
 * Connected → publish/challenge as you; disconnected → relayer.
 */
export function WalletButton({ variant = "nav" }: WalletButtonProps) {
  const { address, isConnected, chainId, status } = useConnection();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongChain = isConnected && chainId !== monadTestnet.id;
  const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];

  if (variant === "panel") {
    if (!isConnected) {
      return (
        <div className="space-y-2">
          <button
            type="button"
            disabled={!injected || isPending}
            onClick={() => injected && connect({ connector: injected })}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink transition-colors hover:border-ember/35 disabled:opacity-40"
          >
            <Wallet size={14} />
            {isPending ? "Connecting…" : "Connect wallet (optional)"}
          </button>
          <p className="px-1 text-[11px] leading-relaxed text-muted">
            Without a wallet, Publish still works via the fondof relayer on
            Monad testnet.
          </p>
          {error && (
            <p className="px-1 text-[11px] text-ember">{error.message}</p>
          )}
        </div>
      );
    }

    return (
      <div className="panel-sm space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Publishing as
            </p>
            <p className="truncate font-mono text-sm text-ink">
              {shortAddress(address!)}
            </p>
          </div>
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
            className="w-full rounded-full bg-ember/15 px-3 py-2 text-xs font-medium text-ember"
          >
            {switching ? "Switching…" : "Switch to Monad Testnet"}
          </button>
        ) : (
          <p className="text-[11px] text-muted">
            Forge txs come from your address — you are the on-chain forger.
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
            Switch network
          </button>
        )}
        <button
          type="button"
          onClick={() => disconnect()}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-2.5 py-1 font-mono text-[11px] text-ink transition-colors hover:border-ember/35"
          title="Disconnect wallet"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${wrongChain ? "bg-ember" : "bg-steel"}`}
          />
          {shortAddress(address)}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!injected || isPending || status === "connecting"}
      onClick={() => injected && connect({ connector: injected })}
      className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-ember/35 hover:text-ink disabled:opacity-40"
    >
      <Wallet size={12} />
      {isPending ? "…" : "Wallet"}
    </button>
  );
}
