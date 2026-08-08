"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, ExternalLink, Flame, FileText } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Worthiness } from "@/lib/idea-insights";
import { buildApplyPack } from "@/lib/apply-pack";
import type { ConnectedRepo } from "@/lib/github-repo";

interface IdeaShardProps {
  id: string;
  title: string;
  description: string;
  patternType: "technique" | "mental-model" | "anti-pattern" | "architecture";
  domains: string[];
  applicability?: string[];
  index?: number;
  worthiness?: Worthiness;
  worthinessReason?: string;
  worthinessConfidence?: number;
  /** Active-repo fit line */
  fitDetail?: string | null;
  repoMatches?: { name: string; why: string }[];
  activeRepo?: ConnectedRepo | null;
  idea?: {
    id: string;
    title: string;
    description: string;
    domain: string[];
    applicability: string[];
    patternType: IdeaShardProps["patternType"];
    sourceUrl: string;
    sourceHash: string;
    embedding: number[];
  };
  similarSkill?: {
    title: string;
    url: string;
    label: "covers" | "partial";
    why: string;
    snippet?: string;
    method?: "embedding" | "lexical";
  } | null;
}

const TYPE_MARK: Record<IdeaShardProps["patternType"], string> = {
  technique: "T",
  "mental-model": "M",
  "anti-pattern": "A",
  architecture: "R",
};

const WORTH_LABEL: Record<Worthiness, string> = {
  forge: "Forge",
  apply: "Apply",
  skip: "Skip",
};

/**
 * Paper shard — forge material with fit + overlap signals.
 */
export function IdeaShard({
  id,
  title,
  description,
  patternType,
  domains,
  applicability = [],
  index = 0,
  worthiness,
  worthinessReason,
  worthinessConfidence,
  fitDetail,
  repoMatches = [],
  activeRepo,
  idea,
  similarSkill,
}: IdeaShardProps) {
  const {
    selectedIdeaIds,
    toggleIdeaSelection,
    selectIdeas,
    setGapForIdea,
    setForgeOpen,
  } = useAppStore();
  const isSelected = selectedIdeaIds.has(id);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyText, setApplyText] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const skew = index % 2 === 0 ? -0.6 : 0.7;
  const xBias = index % 2 === 0 ? -6 : 8;
  const delay = Math.min(index, 6) * 0.04;

  const tags = [
    ...domains.slice(0, 2),
    ...applicability.filter((a) => !domains.includes(a)).slice(0, 2),
  ];

  const openApplyPack = async () => {
    const packIdea = idea ?? {
      id,
      title,
      description,
      domain: domains,
      applicability,
      patternType,
      sourceUrl: "",
      sourceHash: "",
      embedding: [],
    };
    const pack = buildApplyPack(packIdea, activeRepo);
    setApplyText(pack);
    setApplyOpen(true);
    try {
      await navigator.clipboard.writeText(pack);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const forgeTheGap = () => {
    if (!similarSkill) return;
    setGapForIdea(id, {
      title: similarSkill.title,
      url: similarSkill.url,
      snippet: similarSkill.snippet ?? similarSkill.why,
    });
    const next = new Set(selectedIdeaIds);
    next.add(id);
    selectIdeas([...next]);
    setForgeOpen(true);
  };

  const skipReforge = () => {
    if (isSelected) toggleIdeaSelection(id);
    setGapForIdea(id, null);
  };

  return (
    <motion.div
      initial={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 18, rotate: skew * 2, x: xBias }
      }
      animate={{
        opacity: 1,
        y: isSelected ? -4 : 0,
        x: isSelected ? 0 : xBias * 0.35,
        rotate: isSelected ? 0 : skew,
        scale: isSelected ? 1.01 : 1,
      }}
      transition={{
        duration: 0.36,
        ease: [0.22, 1, 0.36, 1],
        delay: reduceMotion ? 0 : delay,
      }}
      className={`idea-shard group relative w-full text-left ${
        isSelected ? "idea-shard--selected" : ""
      } ${worthiness === "skip" ? "idea-shard--skip" : ""} ${
        similarSkill?.label === "covers" ? "idea-shard--covered" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => {
          if (worthiness === "skip") return;
          if (similarSkill?.label === "covers") return;
          toggleIdeaSelection(id);
        }}
        aria-pressed={isSelected}
        className="flex w-full items-stretch gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/45"
      >
        <span className="idea-shard__crease" aria-hidden />
        <span className="idea-shard__mark" aria-hidden>
          {TYPE_MARK[patternType]}
        </span>

        <div className="relative min-w-0 flex-1 py-1 pr-2">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {worthiness && (
              <span
                className={`idea-shard__worth idea-shard__worth--${worthiness}`}
              >
                {WORTH_LABEL[worthiness]}
                {typeof worthinessConfidence === "number" && (
                  <span className="ml-1 opacity-70">
                    {Math.round(worthinessConfidence * 100)}%
                  </span>
                )}
              </span>
            )}
            {similarSkill && (
              <span
                className={`idea-shard__overlap idea-shard__overlap--${similarSkill.label}`}
                title={similarSkill.why}
              >
                {similarSkill.label === "covers" ? "Exists" : "Partial"}
                {similarSkill.method === "embedding" ? " · emb" : ""}
              </span>
            )}
            {repoMatches.slice(0, 2).map((m) => (
              <span key={m.name} className="idea-shard__repo" title={m.why}>
                {m.name}
              </span>
            ))}
          </div>
          <h3 className="font-serif text-[1.05rem] leading-snug tracking-tight text-ink sm:text-[1.15rem]">
            {title}
          </h3>
          <p
            className={`mt-1.5 text-[12px] leading-relaxed text-foreground-secondary transition-opacity ${
              isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-100"
            }`}
          >
            {description}
          </p>
          {worthinessReason && (
            <p className="mt-2 text-[11px] leading-snug text-ink/65">
              {worthinessReason}
            </p>
          )}
          {fitDetail && (
            <p className="mt-1.5 text-[11px] leading-snug text-ink/70">
              {fitDetail}
            </p>
          )}
          {tags[0] && (
            <p className="mt-2 font-mono text-[10px] tracking-wide text-muted">
              {tags.join(" · ")}
            </p>
          )}
        </div>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-ink/6 pt-2 pl-8">
        {(worthiness === "apply" || similarSkill?.label === "covers") && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void openApplyPack();
            }}
            className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ember"
          >
            <FileText size={11} />
            {copied && applyOpen ? "Apply pack copied" : "Apply to repo"}
          </button>
        )}
        {worthiness === "skip" && (
          <span className="text-[11px] text-muted">
            One-off — leave out of forge
          </span>
        )}
        {worthiness === "forge" && !similarSkill && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelected) toggleIdeaSelection(id);
            }}
            className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ember"
          >
            <Flame size={11} />
            {isSelected ? "In forge tray" : "Add to forge"}
          </button>
        )}

        {similarSkill && (
          <>
            <a
              href={similarSkill.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex max-w-full items-center gap-1 text-[11px] text-muted hover:text-ember"
            >
              <ExternalLink size={11} className="shrink-0" />
              <span className="truncate">
                {similarSkill.label === "covers"
                  ? "Use existing: "
                  : "Compare: "}
                {similarSkill.title}
              </span>
            </a>
            {similarSkill.label === "covers" ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  skipReforge();
                }}
                className="text-[11px] text-muted hover:text-ink"
              >
                Skip reforging
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  forgeTheGap();
                }}
                className="inline-flex items-center gap-1 text-[11px] text-ember hover:text-ember-hot"
              >
                <Flame size={11} />
                Forge the gap
              </button>
            )}
          </>
        )}
      </div>

      {applyOpen && applyText && (
        <div className="mt-2 ml-8 rounded-lg border border-ink/10 bg-paper/90 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-ink">
              Apply pack
              {activeRepo ? ` · ${activeRepo.name}` : ""}
            </p>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(applyText)}
              className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-ember"
            >
              <Copy size={10} />
              Copy
            </button>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-foreground-secondary">
            {applyText}
          </pre>
        </div>
      )}
    </motion.div>
  );
}
