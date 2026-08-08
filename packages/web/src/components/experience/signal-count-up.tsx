"use client";

import { useEffect, useState } from "react";
import { formatSignal } from "@/lib/idea-insights";

interface SignalCountUpProps {
  value: string | null | undefined;
  className?: string;
  /** Replay when this key changes (e.g. phase → attested) */
  playKey?: string | number;
  durationMs?: number;
}

/**
 * Count-up for on-chain signal — peak readout after attest / use.
 */
export function SignalCountUp({
  value,
  className = "",
  playKey,
  durationMs = 900,
}: SignalCountUpProps) {
  const [display, setDisplay] = useState("—");
  const target = formatSignal(value);

  useEffect(() => {
    if (!value || target === "—") {
      setDisplay("—");
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(target);
      return;
    }

    // Numeric path (scientific / float / int)
    const asNum = Number(target);
    if (!Number.isFinite(asNum)) {
      setDisplay(target);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const current = asNum * eased;
      // Match formatSignal style for small eth-like values
      if (asNum >= 1e12 || String(value).length > 12) {
        setDisplay(current.toPrecision(3));
      } else if (asNum < 10) {
        setDisplay(current.toPrecision(3));
      } else {
        setDisplay(String(Math.round(current)));
      }
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, target, playKey, durationMs]);

  return (
    <span className={`tabular-nums ${className}`} aria-label={`Signal ${target}`}>
      {display}
    </span>
  );
}
