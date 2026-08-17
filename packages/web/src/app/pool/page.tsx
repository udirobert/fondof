"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { SignalPoolStrip } from "@/components/signal-pool-strip";
import { EconomicsHonesty } from "@/components/economics-honesty";
import { RecentPublicSkills } from "@/components/recent-public-skills";

/**
 * SkillPool craft desk — one composition: brand, draw ritual, paper skills.
 */
export default function PoolPage() {
  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 pb-24">
        <header className="text-center">
          <FondofWordmark size="inline" />
          <h1 className="mt-4 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
            SkillPool
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-foreground-secondary">
            Draw a skill agents have proven — or open one and join the loop.
          </p>
        </header>

        <SignalPoolStrip desk />

        <section aria-label="Public skills">
          <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-muted">
            Public skills · the shelf
          </p>
          <RecentPublicSkills limit={8} />
        </section>

        <div className="border-t border-ink/8 pt-4">
          <EconomicsHonesty variant="line" />
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 text-sm text-ember hover:text-ember-hot"
        >
          <Flame size={14} />
          Forge your own
        </Link>
      </div>
    </div>
  );
}
