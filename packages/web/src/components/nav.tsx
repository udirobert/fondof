"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { fondofPhrase } from "@/lib/fondof-phrase";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { AuthButton } from "@/components/auth-button";

export function Nav() {
  const pathname = usePathname();
  const ideas = useAppStore((s) => s.ideas);
  const sources = useAppStore((s) => s.sources);
  const selected = useAppStore((s) => s.selectedIdeaIds.size);
  const forgeOpen = useAppStore((s) => s.forgeOpen);
  const isIngesting = useAppStore((s) => s.isIngesting);
  const phrase = useMemo(() => fondofPhrase(sources), [sources]);

  const step = forgeOpen ? 3 : ideas.length > 0 ? 2 : isIngesting ? 1 : 1;
  const showObject = ideas.length > 0 || isIngesting;
  const onFloor = pathname === "/" || pathname === "/canvas";
  const onPool = pathname === "/pool" || pathname?.startsWith("/s/");

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-ink/8 bg-parchment/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-5">
        <Link href="/" className="group min-w-0">
          <FondofWordmark
            object={showObject ? phrase.object : undefined}
            size="nav"
            className="transition-colors group-hover:[&>span:first-child]:text-ember"
          />
        </Link>

        {onFloor && (
          <ol
            className="hidden items-center gap-1 text-xs sm:flex"
            aria-label="Progress"
          >
            {[
              { n: 1, label: "Source" },
              { n: 2, label: "Ideas" },
              { n: 3, label: "Skill" },
            ].map((item, i) => (
              <li key={item.n} className="flex items-center gap-1">
                {i > 0 && (
                  <span aria-hidden className="px-1 text-muted/40">
                    →
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-1 transition-colors ${
                    step === item.n
                      ? "bg-mist font-medium text-ink"
                      : step > item.n
                        ? "text-ink/55"
                        : "text-muted"
                  }`}
                >
                  {item.n} {item.label}
                  {item.n === 2 && selected > 0 ? ` · ${selected}` : ""}
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              onFloor
                ? "bg-mist font-medium text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            Fond
          </Link>
          <Link
            href="/pool"
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              onPool
                ? "bg-ember/10 font-medium text-ember"
                : "text-muted hover:text-ink"
            }`}
          >
            Pool
          </Link>
          <AuthButton variant="nav" />
        </div>
      </div>
    </nav>
  );
}
