"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tip } from "@/components/tip";
import { getTopSkills, type SkillOnChainResponse } from "@/lib/api";
import { formatSignal } from "@/lib/idea-insights";
import { getSkillMeta } from "@/lib/skill-meta";
import { skillPublicPath } from "@/lib/skill-share";

interface SkillPoolPulseProps {
  className?: string;
  /** Quieter on the empty pad */
  compact?: boolean;
}

/**
 * Floor chrome only — presence + peek. Draw ritual lives on /pool.
 */
export function SkillPoolPulse({
  className = "",
  compact = false,
}: SkillPoolPulseProps) {
  const [skills, setSkills] = useState<SkillOnChainResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void getTopSkills(3)
        .then((res) => {
          if (cancelled) return;
          setSkills((res.skills ?? []).filter((s) => !s.error).slice(0, 3));
        })
        .catch(() => {
          if (!cancelled) setSkills([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const id = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <section
      className={`border-b border-ink/8 pb-3 ${className}`}
      aria-label="Live SkillPool"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Tip tip="skillpool">
          <Link
            href="/pool"
            className="font-serif text-base text-ink hover:text-ember"
          >
            SkillPool
          </Link>
        </Tip>
        <Link
          href="/pool"
          className="text-[11px] text-ember hover:underline"
        >
          {skills.length > 0 ? "Open the desk →" : "How it works →"}
        </Link>
      </div>

      {!compact && (
        <p className="mt-0.5 text-[12px] text-muted">
          Skills with real usage and quality signals
        </p>
      )}

      {loading && skills.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted">Listening…</p>
      ) : skills.length === 0 ? (
        <p className="mt-2 text-[12px] text-foreground-secondary">
          No public skills yet — forge and publish to open the loop.
        </p>
      ) : (
        <p className="mt-2 text-[12px] leading-relaxed text-ink">
          {skills.map((s, i) => (
            <span key={s.skillHash}>
              {i > 0 ? " · " : ""}
              <Link
                href={skillPublicPath(s.skillHash)}
                className="underline-offset-2 hover:text-ember hover:underline"
              >
                {s.title?.slice(0, 28) ||
                  getSkillMeta(s.skillHash)?.title?.slice(0, 28) ||
                  formatSignal(s.signal)}
                <span className="text-muted">
                  {" "}
                  · {formatSignal(s.signal)}
                </span>
              </Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
