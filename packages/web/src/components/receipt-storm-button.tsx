"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Zap } from "lucide-react";
import { stormUsage } from "@/lib/api";

interface ReceiptStormButtonProps {
  skillHash: string;
  count?: number;
  variant?: "primary" | "panel";
  /** Collapsed behind Monad thesis by default */
  gated?: boolean;
  onComplete?: (result: {
    count: number;
    confirmedMs: number;
    submittedMs: number;
    signal?: string;
    usageCount?: number;
  }) => void;
}

/**
 * Monad thesis demo — N use() receipts. Gated so it doesn’t confuse the main flow.
 */
export function ReceiptStormButton({
  skillHash,
  count = 12,
  variant = "primary",
  gated = true,
  onComplete,
}: ReceiptStormButtonProps) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState(!gated);

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
        `${n} agent uses confirmed in ${confirmed}ms — cheap per-use receipts on Monad.`,
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

  if (gated && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-ink/15 px-3 py-2.5 text-left text-[11px] text-muted hover:border-ember/30 hover:text-ink"
      >
        <span>See the Monad thesis — many agent uses, one cheap L1</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-ink/8 bg-mist/30 p-3">
      {gated && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex w-full items-center justify-between text-[10px] uppercase tracking-wider text-muted"
        >
          Monad thesis demo
          <ChevronDown size={12} className="rotate-180" />
        </button>
      )}
      <p className="text-[11px] leading-snug text-foreground-secondary">
        Simulate a burst of agents using this skill. Monad makes per-use
        receipts practical — watch the quality score climb.
      </p>
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
        {busy ? "Agents using…" : `Simulate ${count} agent uses`}
      </button>
      {note && (
        <p className="text-center text-[10px] leading-snug text-muted">{note}</p>
      )}
    </div>
  );
}
