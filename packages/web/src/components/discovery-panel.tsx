"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { ExistingSkillHit } from "@/lib/api";

interface DiscoveryPanelProps {
  existingSkills: ExistingSkillHit[];
  repoMatchSummary: { name: string; count: number; why?: string }[];
  forgeWorthyCount: number;
  totalIdeas: number;
}

/**
 * One dense beat after ingest — overlap + fit + what to do next.
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
            · {existingSkills.length} similar skill
            {existingSkills.length === 1 ? "" : "s"} exist — compose what&apos;s
            missing
          </>
        )}
      </p>

      {hasSkills && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
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

      <p className="mt-2 text-[11px] text-muted">
        Forge = reusable skill · Apply = use once · Skip = not worth it
      </p>
    </motion.section>
  );
}
