"use client";

import { motion } from "framer-motion";
import { ExternalLink, GitFork, Layers } from "lucide-react";
import type { ExistingSkillHit } from "@/lib/api";

interface DiscoveryPanelProps {
  existingSkills: ExistingSkillHit[];
  repoMatchSummary: { name: string; count: number; why?: string }[];
  forgeWorthyCount: number;
  totalIdeas: number;
}

/**
 * Post-ingest USP surface: overlap with existing skills + stack fit.
 * Not a card grid — a thin discovery strip above the shard plane.
 */
export function DiscoveryPanel({
  existingSkills,
  repoMatchSummary,
  forgeWorthyCount,
  totalIdeas,
}: DiscoveryPanelProps) {
  const hasSkills = existingSkills.length > 0;
  const hasRepos = repoMatchSummary.length > 0;
  if (!hasSkills && !hasRepos && forgeWorthyCount === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="discovery-strip mb-5 sm:mb-6"
      aria-label="Discovery"
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-serif text-lg text-ink">Before you forge</p>
        <p className="text-xs text-muted">
          {forgeWorthyCount} of {totalIdeas} look skill-worthy
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-5">
        {hasSkills && (
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
              <Layers size={12} />
              {existingSkills.length} skill
              {existingSkills.length === 1 ? "" : "s"} already cover this
            </div>
            <ul className="space-y-1.5">
              {existingSkills.slice(0, 3).map((skill) => (
                <li key={skill.url}>
                  <a
                    href={skill.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2 text-sm text-ink transition-colors hover:text-ember"
                  >
                    <ExternalLink
                      size={12}
                      className="mt-1 shrink-0 text-muted group-hover:text-ember"
                    />
                    <span className="min-w-0">
                      <span className="font-medium underline-offset-2 group-hover:underline">
                        {skill.title || skill.url}
                      </span>
                      {skill.snippet && (
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted line-clamp-2">
                          {skill.snippet}
                        </span>
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Combine what&apos;s missing into your hallmark skill — don&apos;t
              reforge the same pattern.
            </p>
          </div>
        )}

        {hasRepos && (
          <div className="min-w-0 sm:w-52 sm:shrink-0">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
              <GitFork size={12} />
              Matches your repos
            </div>
            <ul className="space-y-1.5">
              {repoMatchSummary.map((r) => (
                <li key={r.name} className="text-sm text-ink">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted">
                    {" "}
                    · {r.count} shard{r.count === 1 ? "" : "s"}
                  </span>
                  {r.why && (
                    <span className="mt-0.5 block font-mono text-[10px] text-muted">
                      {r.why}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.section>
  );
}
