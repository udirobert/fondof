"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTopSkills, type SkillOnChainResponse } from "@/lib/api";
import { formatSignal } from "@/lib/idea-insights";
import { shortAddress } from "@/lib/monad-chain";
import { skillPublicPath } from "@/lib/skill-share";

/** One-liner social proof — not a card grid. */
export function LiveSignalLine() {
  const [skills, setSkills] = useState<SkillOnChainResponse[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getTopSkills(3)
      .then((res) => {
        if (cancelled || res.error || !res.skills?.length) return;
        setSkills(res.skills.filter((s) => !s.error).slice(0, 3));
      })
      .catch(() => {
        // silent — home still works offline
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (skills.length === 0) return null;

  return (
    <p className="mt-6 max-w-md text-center font-mono text-[10px] leading-relaxed tracking-wide text-muted">
      Live on Monad
      {skills.map((s) => (
        <span key={s.skillHash}>
          {" · "}
          <Link
            href={skillPublicPath(s.skillHash)}
            className="text-ink/70 underline-offset-2 hover:text-ember hover:underline"
          >
            {shortAddress(s.forger)} · sig {formatSignal(s.signal)}
          </Link>
        </span>
      ))}
    </p>
  );
}
