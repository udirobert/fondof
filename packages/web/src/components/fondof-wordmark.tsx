"use client";

import { AnimatePresence, motion } from "framer-motion";

interface FondofWordmarkProps {
  object?: string;
  /** quiet = nav; hero = larger */
  size?: "nav" | "hero" | "inline";
  className?: string;
}

/** fondof · the pod — brand that wears what you brought. */
export function FondofWordmark({
  object,
  size = "nav",
  className = "",
}: FondofWordmarkProps) {
  const brand =
    size === "hero"
      ? "font-serif text-4xl sm:text-5xl text-ink leading-none"
      : size === "inline"
        ? "font-serif text-2xl text-ink leading-none"
        : "font-serif text-lg tracking-tight text-ink";

  const obj =
    size === "hero"
      ? "font-serif text-xl sm:text-2xl text-ember"
      : size === "inline"
        ? "font-serif text-base text-ember"
        : "font-serif text-sm text-ember/90";

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
      <span className={brand}>fondof</span>
      <AnimatePresence mode="wait">
        {object && object !== "this source" ? (
          <motion.span
            key={object}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.22 }}
            className={`${obj} inline-flex items-baseline gap-1`}
          >
            <span className="text-muted/50 font-sans text-[0.65em] font-normal tracking-normal">
              ·
            </span>
            {object}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
