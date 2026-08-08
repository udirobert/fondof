"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LandingHit } from "@/lib/where-it-lands";

interface WhereItLandsProps {
  hits: LandingHit[];
  ready?: boolean;
  repo?: string;
}

/**
 * Memorable structural map — not a live agent run on the tree.
 */
export function WhereItLandsList({
  hits,
  ready = false,
  repo,
}: WhereItLandsProps) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!ready || hits.length === 0) {
      setShow(false);
      return;
    }
    if (reduce) {
      setShow(true);
      return;
    }
    setShow(false);
    const t = window.setTimeout(() => setShow(true), 80);
    return () => window.clearTimeout(t);
  }, [ready, hits, reduce]);

  if (!hits.length) return null;

  return (
    <div className="rounded-xl border border-ink/8 bg-paper/70 px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-muted">
          Where it lands
        </p>
        {repo && (
          <p className="truncate font-mono text-[10px] text-muted">{repo}</p>
        )}
      </div>
      <ul className="space-y-1.5">
        {hits.map((hit, i) => (
          <motion.li
            key={`${hit.path}-${i}`}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={show ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
            transition={{
              duration: 0.28,
              delay: reduce ? 0 : i * 0.07,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex items-start gap-2"
          >
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${show ? "bg-ember" : "bg-ink/15"}`}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block font-mono text-[11px] text-ink">
                {hit.path}
              </span>
              <span className="block text-[10px] leading-snug text-muted">
                {hit.why}
              </span>
            </span>
          </motion.li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-muted">
        Structural landing map — not a live agent run on your tree.
      </p>
    </div>
  );
}
