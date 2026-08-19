"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { useParams } from "next/navigation";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { RecentPublicSkills } from "@/components/recent-public-skills";

const LABELS: Record<string, string> = {
  reliability: "Reliability",
  performance: "Performance",
  architecture: "Architecture",
  security: "Security",
  "developer-tools": "Developer tools",
  "product-and-ux": "Product & UX",
  "data-and-state": "Data & state",
  "team-practice": "Team practice",
  "general-engineering": "General engineering",
};

const DESCRIPTIONS: Record<string, string> = {
  reliability: "Retries, failure handling, observability, and resilience.",
  performance: "Latency, caching, rendering, scale, and resource efficiency.",
  architecture: "Boundaries, systems design, APIs, state, and composition.",
  security: "Auth, privacy, validation, abuse resistance, and trust.",
  "developer-tools": "Tooling, DX, testing, automation, and agent workflows.",
  "product-and-ux": "Interfaces, accessibility, product behavior, and user experience.",
  "data-and-state": "Data flow, persistence, synchronization, and state management.",
  "team-practice": "Planning, communication, documentation, and reusable practice.",
  "general-engineering": "Useful engineering practice that does not fit one narrower genre.",
};

export default function DiscoverGenrePage() {
  const params = useParams<{ genre: string }>();
  const slug = decodeURIComponent(params.genre ?? "").toLowerCase();
  const label = LABELS[slug] ?? slug.replace(/-/g, " ");
  const description = DESCRIPTIONS[slug] ?? "Public skills fitted to real repositories.";

  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 pb-24">
        <header className="text-center">
          <FondofWordmark size="inline" />
          <p className="mt-5 text-[11px] uppercase tracking-wider text-muted">
            Genre discovery
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
            {label}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-foreground-secondary">
            {description}
          </p>
          <p className="mx-auto mt-3 max-w-sm text-[11px] leading-snug text-muted">
            Browse fitted skills by topic, stack, and attached evidence. This is
            discovery context—not a causal quality verdict.
          </p>
        </header>

        <section aria-label={`${label} skills`}>
          <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-muted">
            {label} shelf
          </p>
          <RecentPublicSkills limit={12} initialGenre={slug} />
        </section>

        <div className="flex flex-col items-center gap-2 border-t border-ink/8 pt-6">
          <Link
            href="/pool"
            className="text-sm text-ember hover:text-ember-hot"
          >
            Browse all discovery views
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ember hover:text-ember-hot"
          >
            <Flame size={14} />
            Forge your own skill
          </Link>
        </div>
      </div>
    </div>
  );
}
