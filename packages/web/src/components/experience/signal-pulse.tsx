"use client";

import { AnimatePresence, motion } from "framer-motion";

interface SignalPulseProps {
  /** Increment to fire a pulse */
  beat: number;
}

/** Brief ring when signal grows (use / resolve). */
export function SignalPulse({ beat }: SignalPulseProps) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-[2.75rem] flex -translate-x-1/2 items-center justify-center">
      <AnimatePresence>
        {beat > 0 && (
          <motion.span
            key={beat}
            className="absolute h-28 w-28 rounded-full border-2 border-ember/45"
            initial={{ opacity: 0.6, scale: 0.35 }}
            animate={{ opacity: 0, scale: 1.75 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>
    </span>
  );
}
