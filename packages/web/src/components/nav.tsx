"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Flame, LayoutGrid } from "lucide-react";

const links = [
  { href: "/canvas", label: "Canvas", icon: LayoutGrid },
  { href: "/forge", label: "Forge", icon: Flame },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Compass
            size={20}
            className="text-accent group-hover:rotate-45 transition-transform duration-500"
          />
          <span className="text-base font-semibold tracking-tight">fondof</span>
        </Link>

        <div className="flex items-center gap-0.5">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-accent-soft text-accent font-medium"
                    : "text-foreground-secondary hover:text-foreground hover:bg-background-subtle"
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
