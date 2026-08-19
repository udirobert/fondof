"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Layers, Loader2, Search } from "lucide-react";
import type { ExistingSkillHit, IdeaFromAPI } from "@/lib/api";
import { searchExistingSkills } from "@/lib/api";
import { bestOverlapSummary } from "@/lib/skill-overlap";
import { Tip } from "@/components/tip";

interface DiscoveryPanelProps {
  existingSkills: ExistingSkillHit[];
  repoMatchSummary: { name: string; count: number; why?: string }[];
  forgeWorthyCount: number;
  totalIdeas: number;
  ideas: IdeaFromAPI[];
  onSkillsUpdate: (skills: ExistingSkillHit[]) => void;
  compareNote?: string | null;
  onCompareNote?: (note: string | null) => void;
  /** Nested under WorkStages — drop outer chrome */
  embedded?: boolean;
}

/**
 * Compare stage — Exa on demand so extract stays cheap and intentional.
 */
export function DiscoveryPanel({
  existingSkills,
  repoMatchSummary,
  forgeWorthyCount,
  totalIdeas,
  ideas,
  onSkillsUpdate,
  compareNote,
  onCompareNote,
  embedded = false,
}: DiscoveryPanelProps) {
  const [searching, setSearching] = useState(false);
  const [localNote, setLocalNote] = useState<string | null>(null);
  const note = compareNote ?? localNote;
  const setNote = (n: string | null) => {
    onCompareNote?.(n);
    setLocalNote(n);
  };
  const hasSkills = existingSkills.length > 0;
  const hasRepos = repoMatchSummary.length > 0;
  const overlap = bestOverlapSummary(ideas, existingSkills);

  const repoLine = hasRepos
    ? repoMatchSummary
        .slice(0, 2)
        .map((r) => `${r.name} (${r.count})`)
        .join(" · ")
    : null;

  const searchAgain = async () => {
    if (!ideas.length || searching) return;
    setSearching(true);
    setNote(null);
    try {
      const query = ideas
        .slice(0, 4)
        .map((i) => i.title)
        .join(", ");
      const res = await searchExistingSkills(
        query,
        ideas.slice(0, 4).map((i) => ({
          title: i.title,
          description: i.description,
          embedding: i.embedding,
        })),
      );
      if (res.error) {
        setNote(res.error);
      } else if (res.results?.length) {
        onSkillsUpdate(res.results);
        setNote(
          `Exa found ${res.results.length} related skills${
            res.embedScored ? " · ranked vs your shards" : ""
          }`,
        );
      } else {
        setNote("No close matches — forge is likely novel");
        onSkillsUpdate([]);
      }
    } catch {
      setNote("Compare unavailable right now");
    } finally {
      setSearching(false);
    }
  };

  return (
    <motion.section
      initial={embedded ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={
        embedded
          ? "discovery-strip mb-4 pb-3"
          : "discovery-strip mb-5 sm:mb-6"
      }
      aria-label="Compare similar skills"
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
        <Layers size={12} />
        <Tip tip="compare">
          <span className="cursor-help border-b border-dotted border-muted/50">
            Compare
          </span>
        </Tip>
      </div>

      <p className="text-sm text-ink">
        <span className="font-medium text-ember">{forgeWorthyCount}</span>
        <span className="text-muted">/{totalIdeas}</span>{" "}
        <Tip tip="forge">
          <span className="text-muted">worth forging</span>
        </Tip>
        {hasSkills && (
          <>
            {" "}
            ·{" "}
            {overlap.covered > 0 ? (
              <>
                <span className="font-medium">{overlap.covered}</span> likely
                covered
              </>
            ) : (
              <>{existingSkills.length} similar exist</>
            )}
            {overlap.partial > 0 && (
              <>
                {" "}
                · <span className="font-medium">{overlap.partial}</span> partial
              </>
            )}
          </>
        )}
        {repoLine && (
          <>
            {" "}
            · fits <span className="font-medium">{repoLine}</span>
          </>
        )}
      </p>

      {hasSkills && (
        <ul className="mt-3 space-y-2">
          {existingSkills.slice(0, 4).map((skill) => (
            <li
              key={skill.url}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <a
                href={skill.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group min-w-0 flex-1"
              >
                <span className="inline-flex items-center gap-1.5 font-medium text-ink underline-offset-2 group-hover:text-ember group-hover:underline">
                  <ExternalLink size={12} className="shrink-0 text-muted" />
                  <span className="truncate">{skill.title || skill.url}</span>
                </span>
                {skill.snippet && (
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted line-clamp-2">
                    {skill.snippet}
                  </span>
                )}
              </a>
              <a
                href={skill.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-ink/10 px-2 py-1 text-[10px] text-muted hover:border-ember/35 hover:text-ember"
              >
                Open existing
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void searchAgain()}
          disabled={searching || ideas.length === 0}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-2.5 text-[11px] text-ink hover:border-ember/35 disabled:opacity-40"
        >
          {searching ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Search size={12} />
          )}
          {searching
            ? "Comparing…"
            : hasSkills
              ? "Re-run compare"
              : "Compare similar skills"}
        </button>
        <p className="text-[11px] text-muted">Exa · when you ask</p>
      </div>
      {note && <p className="mt-1.5 text-[11px] text-muted">{note}</p>}
    </motion.section>
  );
}
