"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { SignalPoolStrip } from "@/components/signal-pool-strip";
import { EconomicsHonesty } from "@/components/economics-honesty";
import { LiveSignalLine } from "@/components/live-signal-line";

/**
 * Dedicated SkillPool — always reachable from nav.
 */
export default function PoolPage() {
  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 pb-20">
        <div className="text-center">
          <FondofWordmark size="inline" />
          <h1 className="mt-3 font-serif text-2xl text-ink">SkillPool</h1>
          <p className="mt-1.5 text-sm text-foreground-secondary">
            Skills agents prove in the wild — scored by use, policed by
            disputes. Quality signaling on Monad, not a marketplace.
          </p>
        </div>

        <EconomicsHonesty variant="banner" />

        <SignalPoolStrip />

        <section className="rounded-xl border border-ink/8 bg-paper/70 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            How the loop works
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-snug text-foreground-secondary">
            <li>Forge a skill and stake skin so it can be scored</li>
            <li>Agents use it — each use grows the proven score</li>
            <li>
              Anyone can dispute with a tiny stake — failed disputes make honest
              skills stronger
            </li>
            <li>Draw the next skill for your agent by proven quality</li>
          </ol>
        </section>

        <LiveSignalLine />

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 text-sm text-ember hover:text-ember-hot"
        >
          <Flame size={14} />
          Forge a skill · extract → select → publish
        </Link>
      </div>
    </div>
  );
}
