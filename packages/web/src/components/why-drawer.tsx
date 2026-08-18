"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ProblemStrip } from "@/components/experience/problem-strip";

const STANCE = [
  {
    not: "A skill marketplace",
    is: "A forge — we don’t list or sell skills.",
  },
  {
    not: "A registry",
    is: "We don’t index the ecosystem.",
  },
  {
    not: "A tokenization protocol",
    is: "Provenance + economic quality — not pricing theater.",
  },
];

/** Collapsed myth — problem + stance without a long scroll. */
export function WhyDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <div id="why" className="mx-auto w-full max-w-5xl px-4 pb-16">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted transition-colors hover:bg-mist hover:text-ink"
        aria-expanded={open}
      >
        Why fondof exists
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden"
          >
            <div className="pt-6">
              <ProblemStrip />
              <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
                {STANCE.map((row) => (
                  <div key={row.not} className="copy-plate p-4">
                    <p className="mb-1 font-mono text-[10px] text-muted line-through decoration-muted/50">
                      not {row.not}
                    </p>
                    <p className="text-sm leading-relaxed text-ink">{row.is}</p>
                  </div>
                ))}
              </div>
              <p className="mx-auto mt-6 max-w-xl text-center text-xs text-muted">
                Quality signals need speed — Monad’s TPS and ~300ms finality make
                low-cost public attestations and challenge signals viable when proof matters.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
