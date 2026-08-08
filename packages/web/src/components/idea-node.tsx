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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 24,
        delay: index * 0.08,
      }}
      whileHover={{ scale: 1.03, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => toggleIdeaSelection(id)}
      className={`paper p-5 cursor-pointer max-w-[240px] relative transition-shadow ${
        isSelected ? "ring-2 ring-accent shadow-lg" : ""
      }`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center"
        >
          <Check size={10} className="text-white" />
        </motion.div>
      )}

      {/* Left bar */}
      <div
        className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${
          isSelected ? "bg-accent" : "bg-muted/20"
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
    </motion.div>
  );
}
