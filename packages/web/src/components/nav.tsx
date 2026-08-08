"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, LayoutGrid } from "lucide-react";

const toolLinks = [
  { href: "/canvas", label: "Canvas", icon: LayoutGrid },
  { href: "/forge", label: "Forge", icon: Flame },
];

export function Nav() {
  const pathname = usePathname();
  const isExperience = pathname === "/";

  if (isExperience) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="pointer-events-auto font-serif text-xl tracking-tight text-paper"
          >
            fondof
          </Link>
          <Link
            href="/canvas"
            className="pointer-events-auto rounded-full bg-ember px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ember-hot ember-glow"
          >
            Enter canvas
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-paper/5 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="font-serif text-lg tracking-tight text-paper group-hover:text-ember transition-colors">
            fondof
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {toolLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href === "/forge" && pathname.startsWith("/forge"));
            const isForge = link.href === "/forge";

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-all duration-200 ${
                  isActive && isForge
                    ? "rounded-full bg-ember/20 text-ember font-medium ember-glow"
                    : isActive
                      ? "rounded-full bg-mist text-paper font-medium"
                      : "rounded-full text-muted hover:text-paper hover:bg-mist/60"
                }`}
              >
                <Icon size={14} />
                {link.label}
              </Link>
            );
          })}
        </div>

        <a
          href="https://github.com/udirobert/fondof"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted hover:text-foreground-secondary transition-colors"
        >
          Source
        </a>
      </div>
    </nav>
  );
}
