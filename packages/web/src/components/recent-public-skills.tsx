"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, FileText } from "lucide-react";
import { API_BASE } from "@/lib/api-base";
import { skillPublicPath } from "@/lib/skill-share";

interface PoolSkill {
  skillHash: string;
  title?: string;
  repo?: string;
  onChain?: boolean;
  sourceUrls?: string[];
}

/**
 * A simple, honest list of public skills (not txs). Pairs with the on-chain
 * draw ritual above — this is the browseable shelf.
 */
export function RecentPublicSkills({ limit = 8 }: { limit?: number }) {
  const [skills, setSkills] = useState<PoolSkill[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/skills?limit=${limit}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.skills)) setSkills(data.skills);
      })
      .catch(() => {
        if (!cancelled) setSkills([]);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (skills === null) {
    return (
      <p className="animate-pulse text-center text-[12px] text-muted">
        Loading the shelf…
      </p>
    );
  }

  if (skills.length === 0) {
    return (
      <p className="text-center text-[12px] text-muted">
        Nothing public yet — forge or compose your first skill.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {skills.map((s) => {
        const source = s.sourceUrls?.[0];
        return (
          <li key={s.skillHash}>
            <Link
              href={skillPublicPath(s.skillHash)}
              className="flex items-center justify-between gap-3 rounded-lg border border-ink/8 bg-paper/60 px-3 py-2 text-sm hover:border-ember/30"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText size={14} className="shrink-0 text-muted" />
                <span className="min-w-0 truncate font-medium text-ink">
                  {s.title || "Untitled skill"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted">
                {s.repo && (
                  <span className="max-w-24 truncate">{s.repo}</span>
                )}
                {s.onChain ? (
                  <span className="inline-flex items-center gap-1 text-ember">
                    <ShieldCheck size={12} />
                    stamped
                  </span>
                ) : (
                  <span>off-chain</span>
                )}
                {source && (
                  <Link
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="max-w-28 truncate underline decoration-ink/20 hover:text-ember"
                    title={source}
                  >
                    source
                  </Link>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
