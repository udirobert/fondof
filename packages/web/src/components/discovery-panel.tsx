"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { ExistingSkillHit } from "@/lib/api";

interface DiscoveryPanelProps {
  existingSkills: ExistingSkillHit[];
  repoMatchSummary: { name: string; count: number; why?: string }[];
  forgeWorthyCount: number;
  totalIdeas: number;
}

/**
 * Beat 2 — overlap + fit, collapsed by default so shards stay primary.
 */
export function DiscoveryPanel({
  existingSkills,
  repoMatchSummary,
  forgeWorthyCount,
  totalIdeas,
}: DiscoveryPanelProps) {
  const [open, setOpen] = useState(false);
  const hasSkills = existingSkills.length > 0;
  const hasRepos = repoMatchSummary.length > 0;
  if (!hasSkills && !hasRepos && forgeWorthyCount === 0) return null;

  const repoLine = hasRepos
    ? repoMatchSummary
        .slice(0, 2)
        .map((r) => `${r.name} (${r.count})`)
        .join(" · ")
    : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="discovery-strip mb-5 sm:mb-6"
      aria-label="Discovery"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-baseline justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <p className="text-sm text-ink">
          <span className="font-medium text-ember">{forgeWorthyCount}</span>
          <span className="text-muted">/{totalIdeas}</span> worth forging
          {repoLine && (
            <>
              {" "}
              · fits <span className="font-medium">{repoLine}</span>
            </>
          )}
          {hasSkills && (
            <>
              {" "}
              · {existingSkills.length} similar
            </>
          )}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted">
          Before forge
          <ChevronDown
            size={14}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {hasSkills && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {existingSkills.slice(0, 3).map((skill) => (
                <li key={skill.url}>
                  <a
                    href={skill.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-muted transition-colors hover:text-ember"
                    title={skill.snippet || skill.title}
                  >
                    <ExternalLink size={11} className="shrink-0" />
                    <span className="max-w-[12rem] truncate underline-offset-2 hover:underline">
                      {skill.title || skill.url}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted">
            Forge = reusable · Apply = once · Skip = not worth it. Compose
            what&apos;s missing into your hallmark skill.
          </p>
        </div>
      )}
    </motion.section>
  );
}
