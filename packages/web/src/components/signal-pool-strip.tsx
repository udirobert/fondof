"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dices, Flame, Loader2, Swords, Zap } from "lucide-react";
import { Tip } from "@/components/tip";
import {
  acquireSkill,
  getTopSkills,
  type SkillOnChainResponse,
} from "@/lib/api";
import { formatSignal } from "@/lib/idea-insights";
import { identityLabel, resolveIdentities } from "@/lib/identity";
import { shortAddress } from "@/lib/monad-chain";
import { skillPublicPath } from "@/lib/skill-share";
import { stashAcquireNote } from "@/lib/acquire-note";

interface SignalPoolStripProps {
  /** Nested under WorkStages — drop outer chrome */
  embedded?: boolean;
}

/**
 * Live SkillPool — draw by proven quality, use / challenge loop.
 */
export function SignalPoolStrip({ embedded = false }: SignalPoolStripProps) {
  const router = useRouter();
  const [skills, setSkills] = useState<SkillOnChainResponse[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [acquiring, setAcquiring] = useState(false);
  const [acquireNote, setAcquireNote] = useState<string | null>(null);
  const shell = embedded ? "mb-4 pb-3" : "mb-5 border-b border-ink/8 pb-4";

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void getTopSkills(5)
        .then(async (res) => {
          if (cancelled) return;
          const list = (res.skills ?? []).filter((s) => !s.error).slice(0, 5);
          setSkills(list);
          if (list.length) {
            const resolved = await resolveIdentities(list.map((s) => s.forger));
            if (cancelled) return;
            const next = new Map<string, string>();
            for (const [addr, id] of resolved) {
              next.set(addr, identityLabel(id));
            }
            setNames(next);
          }
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

  const onAcquire = async () => {
    setAcquiring(true);
    setAcquireNote(null);
    try {
      const res = await acquireSkill();
      if (res.error || !res.skillHash) {
        setAcquireNote(res.error || "Pool empty — forge first");
        return;
      }
      const sig = formatSignal(res.skill?.signal);
      const note = `Drawn for your agent because this skill has high proven quality (signal ${sig}, weighted random — not search rank).`;
      stashAcquireNote(note);
      setAcquireNote(note);
      router.push(skillPublicPath(res.skillHash));
    } catch {
      setAcquireNote("Draw unavailable right now");
    } finally {
      setAcquiring(false);
    }
  };

  if (loading && skills.length === 0) {
    return (
      <section className={shell} aria-label="SkillPool">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          SkillPool
        </p>
        <p className="mt-1 text-[12px] text-muted">
          Checking which skills agents are proving…
        </p>
      </section>
    );
  }

  if (skills.length === 0) {
    return (
      <section className={shell} aria-label="SkillPool">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">
          <Tip tip="skillpool">
            <span className="cursor-help border-b border-dotted border-muted/40">
              SkillPool
            </span>
          </Tip>
        </p>
        <p className="text-sm text-ink">The quality loop hasn’t started yet</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12px] leading-snug text-foreground-secondary">
          <li>Forge a skill from a source and publish it</li>
          <li>Agents use it — each use grows the score</li>
          <li>Challenges police quality; the best skills rise</li>
          <li>Draw the next skill for your agent by proven score</li>
        </ol>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted">
          <Flame size={10} className="text-ember" />
          Be the first forger
        </p>
      </section>
    );
  }

  return (
    <section className={shell} aria-label="SkillPool">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
            <Tip tip="skillpool">
              <span className="cursor-help border-b border-dotted border-muted/40">
                Live SkillPool
              </span>
            </Tip>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Skills agents are proving in the wild
          </p>
        </div>
        <Tip tip="acquire">
          <button
            type="button"
            onClick={() => void onAcquire()}
            disabled={acquiring}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ember/30 bg-ember/5 px-2.5 text-[11px] text-ember hover:bg-ember/10 disabled:opacity-40"
          >
            {acquiring ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Dices size={12} />
            )}
            {acquiring ? "Drawing…" : "Draw skill for my agent"}
          </button>
        </Tip>
      </div>
      {acquireNote && (
        <p className="mb-2 text-[11px] leading-snug text-ember">{acquireNote}</p>
      )}
      <ul className="space-y-2">
        {skills.map((s) => {
          const label =
            names.get(s.forger.toLowerCase()) || shortAddress(s.forger);
          const path = skillPublicPath(s.skillHash);
          return (
            <li
              key={s.skillHash}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <div className="min-w-0">
                <Link
                  href={path}
                  className="font-medium text-ink underline-offset-2 hover:text-ember hover:underline"
                >
                  Proven score{" "}
                  <Tip tip="signal">
                    <span className="cursor-help border-b border-dotted border-ink/20">
                      {formatSignal(s.signal)}
                    </span>
                  </Tip>
                </Link>
                <p className="truncate text-[11px] text-muted">
                  {label} · {s.usageCount} agent use
                  {s.usageCount === 1 ? "" : "s"}
                  {s.challengeLosses > 0
                    ? ` · ${s.challengeLosses} lost challenge${s.challengeLosses === 1 ? "" : "s"}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href={path}
                  className="inline-flex items-center gap-1 rounded-full border border-ink/10 px-2 py-1 text-[10px] text-muted hover:border-ember/35 hover:text-ember"
                >
                  <Zap size={10} />
                  Use
                </Link>
                <Link
                  href={path}
                  className="inline-flex items-center gap-1 rounded-full border border-ink/10 px-2 py-1 text-[10px] text-muted hover:border-ember/35 hover:text-ember"
                >
                  <Swords size={10} />
                  Challenge
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] text-muted">
        Drawn by proven quality — not SEO ranking
      </p>
    </section>
  );
}
