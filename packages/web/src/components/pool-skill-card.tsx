"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Tip } from "@/components/tip";
import { formatSignal } from "@/lib/idea-insights";
import { getSkillMeta } from "@/lib/skill-meta";
import { skillPublicPath } from "@/lib/skill-share";
import type { SkillOnChainResponse } from "@/lib/api";

interface PoolSkillCardProps {
  skill: SkillOnChainResponse;
  forgerLabel: string;
  index?: number;
}

/**
 * Paper card for a live skill — same craft grammar as idea shards.
 */
export function PoolSkillCard({
  skill,
  forgerLabel,
  index = 0,
}: PoolSkillCardProps) {
  const path = skillPublicPath(skill.skillHash);
  const skew = index % 2 === 0 ? -0.4 : 0.5;
  const meta = useMemo(
    () => getSkillMeta(skill.skillHash),
    [skill.skillHash],
  );
  const title =
    meta?.title ||
    `Proven by ${skill.usageCount} agent use${skill.usageCount === 1 ? "" : "s"}`;
  const subtitle = meta?.title
    ? `Proven by ${skill.usageCount} use${skill.usageCount === 1 ? "" : "s"} · forged by ${forgerLabel}`
    : `Forged by ${forgerLabel}`;

  return (
    <Link
      href={path}
      className="pool-skill-card group block w-full text-left"
      style={{ transform: `rotate(${skew}deg)` }}
    >
      <div className="flex items-stretch gap-3">
        <span className="pool-skill-card__crease" aria-hidden />
        <div className="min-w-0 flex-1 py-0.5">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Tip tip="signal">
              <span className="idea-shard__worth idea-shard__worth--forge">
                Score {formatSignal(skill.signal)}
              </span>
            </Tip>
            {skill.challengeLosses > 0 && (
              <span className="idea-shard__overlap idea-shard__overlap--partial">
                {skill.challengeLosses} dispute
                {skill.challengeLosses === 1 ? "" : "s"} lost
              </span>
            )}
          </div>
          <h3 className="font-serif text-[1.05rem] leading-snug tracking-tight text-ink group-hover:text-ember">
            {title}
          </h3>
          {meta?.blurb && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-foreground-secondary">
              {meta.blurb}
            </p>
          )}
          <p className="mt-1 text-[12px] text-foreground-secondary">
            {subtitle}
          </p>
          <p className="mt-2 text-[11px] text-ember opacity-0 transition-opacity group-hover:opacity-100">
            Open · use · dispute
          </p>
        </div>
      </div>
    </Link>
  );
}
