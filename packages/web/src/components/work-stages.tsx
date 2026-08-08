"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface WorkStagesProps {
  /** Open when Compare has results so overlap isn’t buried */
  forceOpen?: boolean;
  children: ReactNode;
}

/**
 * Secondary tools after extract — Compare, SkillPool, agent export.
 * Collapsed so the shard plane stays the one job.
 */
export function WorkStages({ forceOpen = false, children }: WorkStagesProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <section className="mb-6 border-b border-ink/8 pb-4" aria-label="More tools">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-1 text-left"
        aria-expanded={open}
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
          More · compare · SkillPool · agent
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
