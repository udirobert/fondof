"use client";

import { useEffect, useState } from "react";
import { Tip } from "@/components/tip";
import type { SkillFitResult } from "@/lib/skill-fit-check";

interface SkillFitStripProps {
  result: SkillFitResult | null;
  ready?: boolean;
}

/**
 * Structural fit check strip — honest heuristics, not CI / agent eval.
 */
export function SkillFitStrip({ result, ready = false }: SkillFitStripProps) {
  const [fill, setFill] = useState(0);

  useEffect(() => {
    if (!result || !ready) {
      setFill(0);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setFill(result.score);
      return;
    }
    setFill(0);
    const id = window.requestAnimationFrame(() => setFill(result.score));
    return () => window.cancelAnimationFrame(id);
  }, [result, ready, result?.score]);

  if (!result) return null;

  return (
    <div className="rounded-xl border border-ink/8 bg-mist/40 px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <Tip tip="Structural fit of the draft — not a live agent eval on your repo">
          <p className="cursor-help text-[11px] uppercase tracking-wider text-muted">
            Fit check
          </p>
        </Tip>
        <p className="font-serif text-lg tabular-nums text-ink">{fill}</p>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
        <div
          className="h-full rounded-full bg-ember transition-[width] duration-700 ease-out"
          style={{ width: `${fill}%` }}
        />
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {result.items.map((item) => (
          <li
            key={item.id}
            title={item.detail}
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              item.status === "pass"
                ? "border-ember/30 bg-ember/10 text-ink"
                : item.status === "soft"
                  ? "border-ink/12 bg-paper text-muted"
                  : "border-ink/15 bg-paper text-ember"
            }`}
          >
            {item.label}
            <span className="ml-1 opacity-70">
              {item.status === "pass" ? "·" : item.status === "soft" ? "~" : "!"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-muted">
        Structural fit check — not a live agent eval on your repo. Proof after
        publish comes from SkillPool use.
      </p>
    </div>
  );
}
