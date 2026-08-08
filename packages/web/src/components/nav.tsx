"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/canvas", label: "Canvas" },
  { href: "/forge", label: "Forge" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">fondof</span>
          <span className="hidden sm:inline text-xs text-muted font-mono bg-surface-raised px-2 py-0.5 rounded">
            beta
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                pathname === link.href
                  ? "bg-surface-raised text-foreground"
                  : "text-muted hover:text-foreground hover:bg-surface"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <a
          href="https://github.com/udirobert/fondof"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}
