"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import type { IdeaFromAPI } from "@/lib/api";
import {
  formatSelectedPrompt,
  formatShardsForAgent,
} from "@/lib/agent-export";

interface AgentExportBarProps {
  ideas: IdeaFromAPI[];
  sourceTitle?: string;
  sourceUrl?: string;
  fondObject?: string;
  repo?: string;
  /** When set, export only these; else all ideas */
  selectedIds?: Set<string>;
  className?: string;
}

/**
 * Fast path for agent workflows — copy paste-ready markdown / forge prompt.
 */
export function AgentExportBar({
  ideas,
  sourceTitle,
  sourceUrl,
  fondObject,
  repo,
  selectedIds,
  className = "mb-4",
}: AgentExportBarProps) {
  const [copied, setCopied] = useState<"md" | "prompt" | null>(null);

  const target =
    selectedIds && selectedIds.size > 0
      ? ideas.filter((i) => selectedIds.has(i.id))
      : ideas;

  if (target.length === 0) return null;

  const copy = async (kind: "md" | "prompt") => {
    const text =
      kind === "md"
        ? formatShardsForAgent({
            ideas: target,
            sourceTitle,
            sourceUrl,
            fondObject,
          })
        : formatSelectedPrompt({ ideas: target, repo });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore
    }
  };

  const scope =
    selectedIds && selectedIds.size > 0
      ? `${selectedIds.size} selected`
      : `${target.length} shards`;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <p className="mr-1 flex items-center gap-1.5 text-[11px] text-muted">
        <Terminal size={12} />
        Agent · {scope}
      </p>
      <button
        type="button"
        onClick={() => void copy("md")}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-2.5 text-[11px] text-ink hover:border-ember/35"
      >
        {copied === "md" ? <Check size={12} className="text-ember" /> : <Copy size={12} />}
        {copied === "md" ? "Copied" : "Copy markdown"}
      </button>
      <button
        type="button"
        onClick={() => void copy("prompt")}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-2.5 text-[11px] text-ink hover:border-ember/35"
      >
        {copied === "prompt" ? (
          <Check size={12} className="text-ember" />
        ) : (
          <Copy size={12} />
        )}
        {copied === "prompt" ? "Copied" : "Copy forge prompt"}
      </button>
    </div>
  );
}
