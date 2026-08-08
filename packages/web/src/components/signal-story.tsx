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
 * Living score — number + formula + plain-language change story + proof bars.
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
  const [trail, setTrail] = useState(0);
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

  // Receipt ticks into the sparkline when use/storm pulses
  useEffect(() => {
    if (pulseBeat <= 0) return;
    setTrail(6);
    const id = window.setInterval(() => {
      setTrail((t) => (t <= 1 ? 0 : t - 1));
    }, 120);
    return () => window.clearInterval(id);
  }, [pulseBeat]);

  const bars = proofBars(backing, usageCount, challengeLosses);

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
        <div className="mx-auto mt-4 max-w-sm">
          <ProofSparkline bars={bars} trail={trail} />
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
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
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted">
        score ≈ escrow + uses − (losses × 5) · signaling, not earnings
      </p>
    </section>
  );
}

function proofBars(
  backing?: string,
  usageCount = 0,
  challengeLosses = 0,
): { key: string; label: string; value: number; tone: "ember" | "ink" | "warn" }[] {
  const backNum = Number(backing ?? 0);
  // Normalize to comparable 0–100 heights for viz (not the on-chain formula units)
  const escrow = Math.min(100, Math.log10(Math.max(backNum, 1) + 1) * 28);
  const uses = Math.min(100, usageCount * 8 + (usageCount > 0 ? 12 : 0));
  const losses = Math.min(100, challengeLosses * 22);
  return [
    { key: "escrow", label: "Escrow", value: escrow, tone: "ember" },
    { key: "uses", label: "Uses", value: uses, tone: "ink" },
    { key: "losses", label: "Losses", value: losses, tone: "warn" },
  ];
}

function ProofSparkline({
  bars,
  trail,
}: {
  bars: ReturnType<typeof proofBars>;
  trail: number;
}) {
  return (
    <div className="rounded-xl border border-ink/8 bg-paper/50 px-3 py-3">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-muted">
        Proof mix
      </p>
      <div className="flex h-16 items-end justify-center gap-4">
        {bars.map((b) => (
          <div key={b.key} className="flex w-12 flex-col items-center gap-1">
            <div className="relative flex h-12 w-7 items-end justify-center overflow-hidden rounded-sm bg-ink/6">
              <div
                className={`w-full rounded-sm transition-[height] duration-700 ease-out ${
                  b.tone === "ember"
                    ? "bg-ember"
                    : b.tone === "warn"
                      ? "bg-ember/45"
                      : "bg-ink/55"
                }`}
                style={{ height: `${Math.max(4, b.value)}%` }}
              />
              {trail > 0 && b.key === "uses" && (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col-reverse items-center gap-0.5"
                  aria-hidden
                >
                  {Array.from({ length: trail }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1 w-1 rounded-full bg-ember"
                      style={{ opacity: 1 - i * 0.14 }}
                    />
                  ))}
                </span>
              )}
            </div>
            <span className="text-[9px] text-muted">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
