"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { fondofPhrase } from "@/lib/fondof-phrase";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { WalletButton } from "@/components/wallet-button";

export function Nav() {
  const pathname = usePathname();
  const ideas = useAppStore((s) => s.ideas);
  const sources = useAppStore((s) => s.sources);
  const selected = useAppStore((s) => s.selectedIdeaIds.size);
  const forgeOpen = useAppStore((s) => s.forgeOpen);
  const isIngesting = useAppStore((s) => s.isIngesting);
  const phrase = useMemo(() => fondofPhrase(sources), [sources]);

  const step = forgeOpen
    ? 3
    : ideas.length > 0
      ? 2
      : isIngesting
        ? 1
        : 1;

  const showObject = ideas.length > 0 || isIngesting;

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

        <ol
          className="hidden items-center gap-1 text-xs sm:flex"
          aria-label="Progress"
        >
          {[
            { n: 1, label: "Paste" },
            { n: 2, label: "Select" },
            { n: 3, label: "Forge" },
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

        <div className="flex items-center gap-3">
          <WalletButton variant="nav" />
          {pathname !== "/" && (
            <Link
              href="/"
              className="text-xs text-muted transition-colors hover:text-ink"
            >
              Home
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
