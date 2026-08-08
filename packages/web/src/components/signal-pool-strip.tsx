"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dices, Flame, Loader2 } from "lucide-react";
import { Tip } from "@/components/tip";
import { PoolSkillCard } from "@/components/pool-skill-card";
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
  /** Desk mode: draw ritual + paper cards (default on /pool) */
  desk?: boolean;
}

/**
 * SkillPool desk — draw as the ritual, skills as paper cards.
 */
export function SignalPoolStrip({ desk = true }: SignalPoolStripProps) {
  const router = useRouter();
  const [skills, setSkills] = useState<SkillOnChainResponse[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [acquiring, setAcquiring] = useState(false);
  const [acquireNote, setAcquireNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void getTopSkills(6)
        .then(async (res) => {
          if (cancelled) return;
          const list = (res.skills ?? []).filter((s) => !s.error).slice(0, 6);
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
      const note = `Drawn for your agent — highest proven quality in the mix (score ${sig}, weighted random).`;
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
      <section aria-label="SkillPool">
        <p className="text-sm text-muted">Folding the live pool…</p>
      </section>
    );
  }

  if (skills.length === 0) {
    return (
      <section aria-label="SkillPool" className="space-y-4">
        <div>
          <h2 className="font-serif text-xl text-ink">The desk is empty</h2>
          <p className="mt-1.5 text-sm text-foreground-secondary">
            Forge a skill, put skin in escrow, and let agents prove it. Disputes
            police quality — failed ones make honest skills stronger.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ember px-5 text-sm font-medium text-paper hover:bg-ember-hot"
        >
          <Flame size={14} />
          Forge the first skill
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="SkillPool" className="space-y-5">
      {desk && (
        <div className="space-y-3">
          <Tip tip="acquire" className="w-full">
            <button
              type="button"
              onClick={() => void onAcquire()}
              disabled={acquiring}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ember px-5 text-sm font-medium text-paper hover:bg-ember-hot disabled:opacity-40"
            >
              {acquiring ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Dices size={16} />
              )}
              {acquiring ? "Drawing…" : "Draw the next skill for my agent"}
            </button>
          </Tip>
          <p className="text-center text-[12px] text-muted">
            Weighted by proven quality — not search rank
          </p>
          {acquireNote && (
            <p className="text-center text-[12px] leading-snug text-ember">
              {acquireNote}
            </p>
          )}
        </div>
      )}

      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted">
          Live on the pool
        </p>
        <div className="idea-shard-plane mt-3 flex flex-col gap-2.5">
          {skills.map((s, i) => (
            <PoolSkillCard
              key={s.skillHash}
              skill={s}
              index={i}
              forgerLabel={
                names.get(s.forger.toLowerCase()) || shortAddress(s.forger)
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
