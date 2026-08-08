"use client";

import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { stormUsage } from "@/lib/api";

interface ReceiptStormButtonProps {
  skillHash: string;
  count?: number;
  variant?: "primary" | "panel";
  onComplete?: (result: {
    count: number;
    confirmedMs: number;
    submittedMs: number;
    signal?: string;
    usageCount?: number;
  }) => void;
}

/**
 * Monad thesis button — fire N use() receipts and show wall-clock time.
 */
export function ReceiptStormButton({
  skillHash,
  count = 12,
  variant = "primary",
  onComplete,
}: ReceiptStormButtonProps) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const run = async () => {
    if (!skillHash || busy) return;
    setBusy(true);
    setNote(`Submitting ${count} agent receipts…`);
    try {
      const res = await stormUsage(skillHash, count);
      if (res.error) {
        setNote(res.error);
        return;
      }
      const confirmed = res.confirmedMs ?? 0;
      const n = res.count ?? count;
      setNote(
        `${n} receipts in ${confirmed}ms on Monad · ~${Math.round(confirmed / n)}ms each`,
      );
      onComplete?.({
        count: n,
        confirmedMs: confirmed,
        submittedMs: res.submittedMs ?? confirmed,
        signal: res.signal,
        usageCount: res.usageCount,
      });
    } catch {
      setNote("Storm unavailable — try a single use");
    } finally {
      setBusy(false);
    }
  };

  const cls =
    variant === "panel"
      ? "flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-ember/30 bg-ember/5 px-4 text-sm text-ember hover:bg-ember/10 disabled:opacity-40"
      : "flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ember/30 bg-ember/5 px-4 text-sm font-medium text-ember hover:bg-ember/10 disabled:opacity-40";

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || !skillHash}
        className={cls}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Zap size={14} />
        )}
        {busy ? "Storming Monad…" : `Simulate ${count} agent uses`}
      </button>
      {note && (
        <p className="text-center text-[10px] leading-snug text-muted">
          {note}
          {!busy && note.includes("Monad") && (
            <>
              {" "}
              · L1 would make per-use tracking impractical
            </>
          )}
        </p>
      )}
    </div>
  );
}
