"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Brain, AlertTriangle, Building2, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface IdeaNodeProps {
  id: string;
  title: string;
  description: string;
  patternType: "technique" | "mental-model" | "anti-pattern" | "architecture";
  domains: string[];
  index?: number;
}

const typeConfig = {
  technique: { icon: Zap, label: "Technique" },
  "mental-model": { icon: Brain, label: "Mental model" },
  "anti-pattern": { icon: AlertTriangle, label: "Anti-pattern" },
  architecture: { icon: Building2, label: "Architecture" },
};

/**
 * Crafted entrance without blocking the job: short stagger, reduced-motion safe.
 */
export function IdeaNode({
  id,
  title,
  description,
  patternType,
  domains,
  index = 0,
}: IdeaNodeProps) {
  const { selectedIdeaIds, toggleIdeaSelection } = useAppStore();
  const isSelected = selectedIdeaIds.has(id);
  const { icon: TypeIcon, label: typeLabel } = typeConfig[patternType];
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const delay = Math.min(index, 5) * 0.045;

  return (
    <div style={{ perspective: reduceMotion ? undefined : 900 }} className="max-w-[240px]">
      <motion.button
        type="button"
        initial={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 14, rotateX: 28, filter: "blur(2px)" }
        }
        animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
        transition={{
          duration: 0.38,
          ease: [0.22, 1, 0.36, 1],
          delay,
        }}
        whileHover={reduceMotion ? undefined : { y: -3 }}
        whileTap={{ scale: 0.985 }}
        onClick={() => toggleIdeaSelection(id)}
        aria-pressed={isSelected}
        className={`paper relative w-full cursor-pointer p-5 text-left transition-shadow will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/50 ${
          isSelected ? "ring-2 ring-ember shadow-md" : ""
        }`}
        style={{
          transformStyle: reduceMotion ? undefined : "preserve-3d",
          transformOrigin: "50% 100%",
        }}
      >
        {isSelected && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-ember"
          >
            <Check size={10} className="text-paper" />
          </motion.div>
        )}

        <div
          className={`absolute top-4 bottom-4 left-0 w-[3px] rounded-full ${
            isSelected ? "bg-ember" : "bg-muted/20"
          }`}
        />

        <div className="pl-2">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] text-muted">
              <TypeIcon size={11} />
              {typeLabel}
            </span>
          </div>

          <h3 className="mb-1.5 text-[13px] leading-snug font-semibold text-foreground">
            {title}
          </h3>

          <p className="line-clamp-3 text-[11px] leading-relaxed text-foreground-secondary">
            {description}
          </p>

          <div className="mt-3 flex flex-wrap gap-1">
            {domains.slice(0, 3).map((domain) => (
              <span
                key={domain}
                className="rounded-full bg-background-subtle px-1.5 py-0.5 text-[10px] text-muted"
              >
                {domain}
              </span>
            ))}
          </div>
        </div>
      </motion.button>
    </div>
  );
}
