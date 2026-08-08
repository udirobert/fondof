"use client";

import { useEffect, useRef, useState } from "react";
import { Tip } from "@/components/tip";
import { SignalCountUp } from "@/components/experience/signal-count-up";
import { SignalPulse } from "@/components/experience/signal-pulse";
import { formatSignal } from "@/lib/idea-insights";
import { signalChangeStory } from "@/lib/glossary";

interface SignalStoryProps {
  signal?: string | null;
  backing?: string;
  usageCount?: number;
  challengeLosses?: number;
  loading?: boolean;
  playKey: string;
  pulseBeat: number;
}

/**
 * Living score — number + formula + plain-language change story.
 */
export function SignalStory({
  signal,
  backing,
  usageCount = 0,
  challengeLosses = 0,
  loading,
  playKey,
  pulseBeat,
}: SignalStoryProps) {
  const [story, setStory] = useState<string | null>(null);
  const prev = useRef<{
    uses: number;
    losses: number;
    signal: string;
  } | null>(null);

  useEffect(() => {
    if (signal == null || loading) return;
    const last = prev.current;
    if (last) {
      const next = signalChangeStory({
        prevUses: last.uses,
        nextUses: usageCount,
        prevLosses: last.losses,
        nextLosses: challengeLosses,
        prevSignal: last.signal,
        nextSignal: signal,
      });
      if (next) setStory(next);
    }
    prev.current = {
      uses: usageCount,
      losses: challengeLosses,
      signal,
    };
  }, [signal, usageCount, challengeLosses, loading]);

  return (
    <section className="relative text-center">
      <SignalPulse beat={pulseBeat} />
      <Tip tip="signal">
        <p className="cursor-help text-[11px] uppercase tracking-wider text-muted">
          Proven to work
        </p>
      </Tip>
      <p className="mt-1 font-serif text-5xl text-ink">
        {loading ? (
          "…"
        ) : (
          <SignalCountUp value={signal} playKey={playKey} />
        )}
      </p>
      <p className="mt-2 text-sm text-foreground-secondary">
        Quality score from agent use — not a price or yield
      </p>
      {story && (
        <p className="mt-2 text-[12px] text-ember" role="status">
          {story}
        </p>
      )}
      {signal != null && !loading && (
        <dl className="mx-auto mt-4 grid max-w-sm grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-ink/8 bg-paper/60 px-2 py-2">
            <dt className="text-[10px] text-muted">Skin in escrow</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-ink tabular-nums">
              {formatSignal(backing)}
            </dd>
          </div>
          <div className="rounded-lg border border-ink/8 bg-paper/60 px-2 py-2">
            <dt className="text-[10px] text-muted">Agent uses</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-ink tabular-nums">
              {usageCount}
            </dd>
          </div>
          <div className="rounded-lg border border-ink/8 bg-paper/60 px-2 py-2">
            <dt className="text-[10px] text-muted">Lost challenges</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-ink tabular-nums">
              {challengeLosses}
            </dd>
          </div>
        </dl>
      )}
      <p className="mt-2 text-[10px] text-muted">
        score ≈ escrow + uses − (losses × 5) · signaling, not earnings
      </p>
    </section>
  );
}
