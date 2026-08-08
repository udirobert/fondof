"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dices, Loader2 } from "lucide-react";
import { Tip } from "@/components/tip";
import {
  acquireSkill,
  getTopSkills,
  type SkillOnChainResponse,
} from "@/lib/api";
import { formatSignal } from "@/lib/idea-insights";
import { skillPublicPath } from "@/lib/skill-share";
import { stashAcquireNote } from "@/lib/acquire-note";

interface SkillPoolPulseProps {
  className?: string;
  /** Quieter on the empty pad */
  compact?: boolean;
}

/**
 * Always-on SkillPool presence — existence is unavoidable; details stay on /pool.
 */
export function SkillPoolPulse({
  className = "",
  compact = false,
}: SkillPoolPulseProps) {
  const router = useRouter();
  const [skills, setSkills] = useState<SkillOnChainResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [acquiring, setAcquiring] = useState(false);

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

  const onDraw = async () => {
    setAcquiring(true);
    try {
      const res = await acquireSkill();
      if (res.error || !res.skillHash) return;
      const sig = formatSignal(res.skill?.signal);
      stashAcquireNote(
        `Drawn for your agent because this skill has high proven quality (signal ${sig}, weighted random — not search rank).`,
      );
      router.push(skillPublicPath(res.skillHash));
    } catch {
      // ignore
    } finally {
      setAcquiring(false);
    }
  };

  return (
    <section
      className={`rounded-xl border border-ember/20 bg-ember/5 ${compact ? "px-3 py-2.5" : "px-3.5 py-3"} ${className}`}
      aria-label="Live SkillPool"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Tip tip="skillpool">
            <Link
              href="/pool"
              className="cursor-help text-[11px] font-medium uppercase tracking-wider text-ember hover:underline"
            >
              SkillPool · live
            </Link>
          </Tip>
          {!compact && (
            <p className="mt-0.5 text-[11px] text-muted">
              Quality signaling on Monad — not a marketplace
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Tip tip="acquire">
            <button
              type="button"
              onClick={() => void onDraw()}
              disabled={acquiring || (!loading && skills.length === 0)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ember/35 bg-paper px-2.5 text-[11px] font-medium text-ember hover:bg-ember/10 disabled:opacity-40"
            >
              {acquiring ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Dices size={12} />
              )}
              {acquiring ? "Drawing…" : "Draw for agent"}
            </button>
          </Tip>
          <Link
            href="/pool"
            className="inline-flex min-h-8 items-center rounded-full border border-ink/10 px-2.5 text-[11px] text-ink hover:border-ember/30"
          >
            Browse pool
          </Link>
        </div>
      </div>

      {loading && skills.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted">Reading live scores…</p>
      ) : skills.length === 0 ? (
        <p className="mt-2 text-[11px] leading-snug text-muted">
          Pool empty — forge & publish to open the loop.{" "}
          <Link href="/pool" className="text-ember hover:underline">
            How it works
          </Link>
        </p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {skills.map((s) => (
            <li key={s.skillHash}>
              <Link
                href={skillPublicPath(s.skillHash)}
                className="text-[12px] text-ink underline-offset-2 hover:text-ember hover:underline"
              >
                Score {formatSignal(s.signal)}
                <span className="text-muted">
                  {" "}
                  · {s.usageCount} use{s.usageCount === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
