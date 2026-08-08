"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { IdeaShard } from "@/components/idea-shard";
import type { IdeaFromAPI } from "@/lib/api";
import { matchRepos, scoreWorthiness } from "@/lib/idea-insights";
import { demoRepos } from "@/lib/demo-data";

export interface IngestPhase {
  phase: string;
  label: string;
}

interface IngestStageProps {
  fondObject: string;
  title?: string;
  phases: IngestPhase[];
  activePhase?: string;
  liveIdeas: IdeaFromAPI[];
  onCancel: () => void;
}

/**
 * Honest ingest theater — phases from the Worker stream, shards land live.
 */
export function IngestStage({
  fondObject,
  title,
  phases,
  activePhase,
  liveIdeas,
  onCancel,
}: IngestStageProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6">
      <div className="text-center">
        <FondofWordmark object={fondObject} size="inline" />
        {title && (
          <p className="mt-2 font-mono text-[11px] text-muted">{title}</p>
        )}
      </div>

      <ol className="mx-auto w-full max-w-sm space-y-2" aria-live="polite">
        {phases.map((p, i) => {
          const isActive = p.phase === activePhase;
          const isPast =
            phases.findIndex((x) => x.phase === activePhase) > i ||
            (!!liveIdeas.length && !isActive);
          return (
            <li
              key={`${p.phase}-${i}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-ember/10 text-ink"
                  : isPast
                    ? "text-ink/55"
                    : "text-muted"
              }`}
            >
              {isActive ? (
                <Loader2 size={14} className="shrink-0 animate-spin text-ember" />
              ) : (
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isPast ? "bg-ember" : "bg-ink/15"
                  }`}
                />
              )}
              <span className={isActive ? "font-medium" : ""}>{p.label}</span>
            </li>
          );
        })}
        {phases.length === 0 && (
          <li className="flex items-center gap-3 px-3 py-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin text-ember" />
            Starting…
          </li>
        )}
      </ol>

      <div className="text-center">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs text-muted hover:bg-mist hover:text-ink"
        >
          <X size={12} />
          Cancel
        </button>
      </div>

      <div className="idea-shard-plane flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {liveIdeas.length === 0
            ? [0, 1, 2].map((i) => (
                <motion.div
                  key={`sk-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="idea-shard animate-pulse !py-3"
                  style={{
                    transform: `rotate(${i % 2 === 0 ? -0.8 : 0.9}deg)`,
                  }}
                >
                  <span className="idea-shard__crease" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-3 w-[70%] rounded bg-ink/12" />
                    <div className="h-2 w-full rounded bg-ink/8" />
                  </div>
                </motion.div>
              ))
            : liveIdeas.map((idea, i) => {
                const worth = scoreWorthiness(idea);
                const repos = matchRepos(idea, demoRepos);
                return (
                  <IdeaShard
                    key={idea.id}
                    id={idea.id}
                    title={idea.title}
                    description={idea.description}
                    patternType={idea.patternType}
                    domains={idea.domain}
                    index={i}
                    worthiness={worth.worthiness}
                    worthinessReason={worth.reason}
                    repoMatches={repos.map((r) => ({
                      name: r.name,
                      why: r.why,
                    }))}
                  />
                );
              })}
        </AnimatePresence>
      </div>
    </div>
  );
}
