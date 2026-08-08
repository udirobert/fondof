"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";

export function Nav() {
  const pathname = usePathname();
  const isExperience = pathname === "/";
  const inTool = pathname.startsWith("/canvas") || pathname.startsWith("/forge");
  const ideas = useAppStore((s) => s.ideas);
  const selected = useAppStore((s) => s.selectedIdeaIds.size);
  const forgeOpen = useAppStore((s) => s.forgeOpen);

  const step = forgeOpen || pathname.startsWith("/forge")
    ? 3
    : ideas.length > 0
      ? 2
      : 1;

  if (isExperience) {
    return (
      <nav className="pointer-events-none fixed top-0 right-0 left-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="pointer-events-auto font-serif text-xl tracking-tight text-ink"
          >
            fondof
          </Link>
          <div className="pointer-events-auto flex items-center gap-3">
            <a
              href="#problem"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:inline"
            >
              Why
            </a>
            <Link
              href="/canvas"
              className="rounded-full bg-ember px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ember-hot"
            >
              Start
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-ink/8 bg-parchment/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="font-serif text-lg tracking-tight text-ink transition-colors group-hover:text-ember">
            fondof
          </span>
        </Link>

        {inTool && (
          <ol className="hidden items-center gap-1 text-xs sm:flex" aria-label="Progress">
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
        )}

        <a
          href="https://github.com/udirobert/fondof"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted transition-colors hover:text-foreground-secondary"
        >
          Source
        </a>
      </div>
    </nav>
  );
}
