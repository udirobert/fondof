"use client";

interface IdeaNodeProps {
  title: string;
  description: string;
  patternType: "technique" | "mental-model" | "anti-pattern" | "architecture";
  domains: string[];
  worthiness: "forge-skill" | "apply-directly" | "skip";
  worthinessScore: number;
}

export function IdeaNode({
  title,
  description,
  patternType,
  domains,
  worthiness,
  worthinessScore,
}: IdeaNodeProps) {
  const glowClass =
    worthiness === "forge-skill"
      ? "glow-high"
      : worthiness === "apply-directly"
        ? "glow-medium"
        : "glow-low";

  const badgeColor =
    worthiness === "forge-skill"
      ? "bg-success/20 text-success border-success/30"
      : worthiness === "apply-directly"
        ? "bg-warning/20 text-warning border-warning/30"
        : "bg-muted/20 text-muted border-muted/30";

  const badgeLabel =
    worthiness === "forge-skill"
      ? "FORGE"
      : worthiness === "apply-directly"
        ? "APPLY"
        : "SKIP";

  const typeIcon =
    patternType === "technique"
      ? "⚡"
      : patternType === "mental-model"
        ? "🧠"
        : patternType === "anti-pattern"
          ? "⚠️"
          : "🏗️";

  return (
    <div
      className={`w-56 rounded-xl border border-border bg-surface-raised p-4 ${glowClass} transition-all hover:scale-105 cursor-pointer`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{typeIcon}</span>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
        >
          {badgeLabel}
        </span>
      </div>

      <h3 className="text-sm font-semibold leading-tight mb-1">{title}</h3>
      <p className="text-xs text-muted line-clamp-2">{description}</p>

      <div className="mt-3 flex flex-wrap gap-1">
        {domains.slice(0, 3).map((domain) => (
          <span
            key={domain}
            className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20"
          >
            {domain}
          </span>
        ))}
      </div>

      {/* Worthiness bar */}
      <div className="mt-3">
        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              worthiness === "forge-skill"
                ? "bg-success"
                : worthiness === "apply-directly"
                  ? "bg-warning"
                  : "bg-muted"
            }`}
            style={{ width: `${worthinessScore * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
