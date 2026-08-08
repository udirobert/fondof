"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { Worthiness } from "@/lib/idea-insights";

interface IdeaShardProps {
  id: string;
  title: string;
  description: string;
  patternType: "technique" | "mental-model" | "anti-pattern" | "architecture";
  domains: string[];
  index?: number;
  worthiness?: Worthiness;
  worthinessReason?: string;
  repoMatches?: { name: string; why: string }[];
}

const TYPE_MARK: Record<IdeaShardProps["patternType"], string> = {
  technique: "T",
  "mental-model": "M",
  "anti-pattern": "A",
  architecture: "R",
};

const WORTH_LABEL: Record<Worthiness, string> = {
  forge: "Forge",
  apply: "Apply",
  skip: "Skip",
};

/**
 * Paper shard — forge material, not a SaaS card.
 * Title-led strip; selection creases and lifts into the tray.
 */
export function IdeaShard({
  id,
  title,
  description,
  patternType,
  domains,
  index = 0,
  worthiness,
  worthinessReason,
  repoMatches = [],
}: IdeaShardProps) {
  const { selectedIdeaIds, toggleIdeaSelection } = useAppStore();
  const isSelected = selectedIdeaIds.has(id);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const skew = index % 2 === 0 ? -0.6 : 0.7;
  const xBias = index % 2 === 0 ? -6 : 8;
  const delay = Math.min(index, 6) * 0.04;

  return (
    <motion.button
      type="button"
      onClick={() => toggleIdeaSelection(id)}
      aria-pressed={isSelected}
      title={worthinessReason}
      initial={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 18, rotate: skew * 2, x: xBias }
      }
      animate={{
        opacity: 1,
        y: isSelected ? -4 : 0,
        x: isSelected ? 0 : xBias * 0.35,
        rotate: isSelected ? 0 : skew,
        scale: isSelected ? 1.01 : 1,
      }}
      transition={{
        duration: 0.36,
        ease: [0.22, 1, 0.36, 1],
        delay: reduceMotion ? 0 : delay,
      }}
      whileHover={
        reduceMotion
          ? undefined
          : { y: isSelected ? -6 : -3, rotate: 0, transition: { duration: 0.2 } }
      }
      whileTap={{ scale: 0.99 }}
      className={`idea-shard group relative w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/45 ${
        isSelected ? "idea-shard--selected" : ""
      } ${worthiness === "skip" ? "idea-shard--skip" : ""}`}
    >
      <span className="idea-shard__crease" aria-hidden />
      <span className="idea-shard__mark" aria-hidden>
        {TYPE_MARK[patternType]}
      </span>

      <div className="relative min-w-0 flex-1 py-1 pr-2">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {worthiness && (
            <span
              className={`idea-shard__worth idea-shard__worth--${worthiness}`}
            >
              {WORTH_LABEL[worthiness]}
            </span>
          )}
          {repoMatches.slice(0, 2).map((m) => (
            <span key={m.name} className="idea-shard__repo" title={m.why}>
              {m.name}
            </span>
          ))}
        </div>
        <h3 className="font-serif text-[1.05rem] leading-snug tracking-tight text-ink sm:text-[1.15rem]">
          {title}
        </h3>
        <p
          className={`mt-1.5 text-[12px] leading-relaxed text-foreground-secondary transition-opacity ${
            isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-100"
          }`}
        >
          {description}
        </p>
        {domains[0] && (
          <p className="mt-2 font-mono text-[10px] tracking-wide text-muted">
            {domains.slice(0, 2).join(" · ")}
          </p>
        )}
      </div>
    </motion.button>
  );
}
