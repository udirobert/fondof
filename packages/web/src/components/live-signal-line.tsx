"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTopSkills, type SkillOnChainResponse } from "@/lib/api";
import { formatSignal } from "@/lib/idea-insights";
import { identityLabel, resolveIdentities } from "@/lib/identity";
import { shortAddress } from "@/lib/monad-chain";
import { skillPublicPath } from "@/lib/skill-share";

/** One-liner social proof — ENS names when available. */
export function LiveSignalLine({ className = "" }: { className?: string }) {
  const [skills, setSkills] = useState<SkillOnChainResponse[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void getTopSkills(3)
      .then(async (res) => {
        if (cancelled || res.error || !res.skills?.length) return;
        const list = res.skills.filter((s) => !s.error).slice(0, 3);
        setSkills(list);
        const resolved = await resolveIdentities(list.map((s) => s.forger));
        if (cancelled) return;
        const next = new Map<string, string>();
        for (const [addr, id] of resolved) {
          next.set(addr, identityLabel(id));
        }
        setNames(next);
      })
      .catch(() => {
        // silent
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (skills.length === 0) return null;

  return (
    <div className={`mx-auto max-w-md text-center ${className}`}>
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-muted">
        Live signal on Monad
        {skills.map((s) => {
          const key = s.forger.toLowerCase();
          const label = names.get(key) || shortAddress(s.forger);
          return (
            <span key={s.skillHash}>
              {" · "}
              <Link
                href={skillPublicPath(s.skillHash)}
                className="text-ink/70 underline-offset-2 hover:text-ember hover:underline"
              >
                {label} · {formatSignal(s.signal)}
                {s.usageCount > 0 ? ` · ${s.usageCount} uses` : ""}
              </Link>
            </span>
          );
        })}
      </p>
      <p className="mt-1 text-[10px] text-muted">
        Use grows signal · challenges cut it · open a skill to join the loop
      </p>
    </div>
  );
}
