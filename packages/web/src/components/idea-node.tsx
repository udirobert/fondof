"use client";

import { motion } from "framer-motion";
import { Zap, Brain, AlertTriangle, Building2 } from "lucide-react";

interface IdeaNodeProps {
  title: string;
  description: string;
  patternType: "technique" | "mental-model" | "anti-pattern" | "architecture";
  domains: string[];
  worthiness: "forge-skill" | "apply-directly" | "skip";
  worthinessScore: number;
  index?: number;
}

const typeConfig = {
  technique: { icon: Zap, label: "Technique" },
  "mental-model": { icon: Brain, label: "Mental model" },
  "anti-pattern": { icon: AlertTriangle, label: "Anti-pattern" },
  architecture: { icon: Building2, label: "Architecture" },
};

const worthinessConfig = {
  "forge-skill": { color: "text-forge", bg: "bg-forge/8", label: "Forge" },
  "apply-directly": { color: "text-apply", bg: "bg-apply/8", label: "Apply" },
  skip: { color: "text-skip", bg: "bg-skip/8", label: "Skip" },
};

export function IdeaNode({
  title,
  description,
  patternType,
  domains,
  worthiness,
  worthinessScore,
  index = 0,
}: IdeaNodeProps) {
  const { icon: TypeIcon, label: typeLabel } = typeConfig[patternType];
  const { color, bg, label: worthLabel } = worthinessConfig[worthiness];

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
      className="paper p-5 cursor-pointer max-w-[240px] relative"
    >
      {/* Worthiness ink mark */}
      <div
        className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${
          worthiness === "forge-skill"
            ? "bg-forge"
            : worthiness === "apply-directly"
              ? "bg-apply"
              : "bg-muted/30"
        }`}
        style={{ opacity: worthinessScore }}
      />

      <div className="pl-2">
        {/* Type + Worthiness */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <TypeIcon size={11} />
            {typeLabel}
          </span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${bg} ${color}`}
          >
            {worthLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-semibold leading-snug text-foreground mb-1.5">
          {title}
        </h3>

        {/* Description */}
        <p className="text-[11px] text-foreground-secondary leading-relaxed line-clamp-3">
          {description}
        </p>

        {/* Domain tags */}
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
