"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import {
  EXPORT_TARGETS,
  formatForHarness,
  type ExportTarget,
} from "@/lib/skill-export";

interface SkillExportPanelProps {
  draft: string;
  title: string;
  ready: boolean;
}

/**
 * Harness-specific export panel — the primary CTA after forging.
 * Shows export options for different agent harnesses.
 */
export function SkillExportPanel({ draft, title, ready }: SkillExportPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!ready || !draft) return null;

  const handleCopy = async (target: ExportTarget) => {
    const { content } = formatForHarness(draft, title, target.id);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(target.id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback: try to copy raw
      await navigator.clipboard.writeText(draft);
      setCopied(target.id);
      window.setTimeout(() => setCopied(null), 2000);
    }
  };

  const primaryTargets = EXPORT_TARGETS.slice(0, 3); // Kiro, Cursor, Claude
  const moreTargets = EXPORT_TARGETS.slice(3); // Copilot, Generic

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-muted">
        Export to your agent
      </p>

      {primaryTargets.map((target) => (
        <button
          key={target.id}
          type="button"
          onClick={() => void handleCopy(target)}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-ink/10 bg-paper px-3.5 py-2 text-left transition-colors hover:border-ember/35"
        >
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">
              {target.label}
            </span>
            <span className="block text-[10px] text-muted">
              {formatForHarness(draft, title, target.id).fullPath}
            </span>
          </div>
          {copied === target.id ? (
            <Check size={14} className="shrink-0 text-emerald-600" />
          ) : (
            <Copy size={14} className="shrink-0 text-muted" />
          )}
        </button>
      ))}

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1.5 py-1 text-[11px] text-muted hover:text-ink"
        >
          <ChevronDown size={12} />
          More formats
        </button>
      )}

      {expanded &&
        moreTargets.map((target) => (
          <button
            key={target.id}
            type="button"
            onClick={() => void handleCopy(target)}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-ink/10 bg-paper px-3.5 py-2 text-left transition-colors hover:border-ember/35"
          >
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">
                {target.label}
              </span>
              <span className="block text-[10px] text-muted">
                {formatForHarness(draft, title, target.id).fullPath}
              </span>
            </div>
            {copied === target.id ? (
              <Check size={14} className="shrink-0 text-emerald-600" />
            ) : (
              <Copy size={14} className="shrink-0 text-muted" />
            )}
          </button>
        ))}

      {copied && (
        <p className="text-center text-[11px] text-emerald-600">
          Copied — paste into your project
        </p>
      )}
    </div>
  );
}
