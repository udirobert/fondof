"use client";

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
 * Codrops-adjacent entrance: preserve-3d rotateX + z stagger into the plane.
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
  const leftBias = index % 2 === 0;

  return (
    <div style={{ perspective: 900 }} className="max-w-[240px]">
      <motion.button
        type="button"
        initial={{
          opacity: 0,
          rotateX: 62,
          z: 140,
          y: 48,
          x: leftBias ? -24 : 24,
          skewX: leftBias ? -8 : 8,
          filter: "blur(4px)",
        }}
        animate={{
          opacity: 1,
          rotateX: 0,
          z: 0,
          y: 0,
          x: 0,
          skewX: 0,
          filter: "blur(0px)",
        }}
        transition={{
          type: "spring",
          stiffness: 220,
          damping: 22,
          delay: index * 0.07,
        }}
        whileHover={{ y: -4, rotateX: -4, z: 20 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => toggleIdeaSelection(id)}
        aria-pressed={isSelected}
        className={`paper p-5 cursor-pointer w-full text-left relative transition-shadow will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/50 ${
          isSelected ? "ring-2 ring-ember shadow-lg ember-glow" : ""
        }`}
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: "50% 100%",
        }}
      >
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ember flex items-center justify-center"
          >
            <Check size={10} className="text-ink" />
          </motion.div>
        )}

        <div
          className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${
            isSelected ? "bg-ember" : "bg-muted/20"
          }`}
        />

        <div className="pl-2">
          <div className="flex items-center justify-between mb-2.5">
            <span className="flex items-center gap-1 text-[11px] text-muted">
              <TypeIcon size={11} />
              {typeLabel}
            </span>
          </div>

          <h3 className="text-[13px] font-semibold leading-snug text-foreground mb-1.5">
            {title}
          </h3>

          <p className="text-[11px] text-foreground-secondary leading-relaxed line-clamp-3">
            {description}
          </p>

          <div className="mt-3 flex flex-wrap gap-1">
            {domains.slice(0, 3).map((domain) => (
              <span
                key={domain}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-background-subtle text-muted"
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
