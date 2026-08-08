"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { shortAddress } from "@/lib/monad-chain";

interface OnChainDetailsProps {
  skillHash: string;
  forger?: string;
  sourceHashes?: string[];
  createdAt?: number;
  explorerLinks?: { label: string; href: string }[];
  children?: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Tech register — hashes, addresses, explorer links. Collapsed by default.
 */
export function OnChainDetails({
  skillHash,
  forger,
  sourceHashes = [],
  createdAt,
  explorerLinks = [],
  children,
  defaultOpen = false,
}: OnChainDetailsProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-ink/8 bg-mist/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          On-chain details
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-2.5 border-t border-ink/8 px-3.5 py-3 font-mono text-[10px] text-muted">
          <div>
            <p className="text-[9px] uppercase tracking-wider">Skill hash</p>
            <p className="mt-0.5 break-all text-ink">{skillHash}</p>
          </div>
          {forger && (
            <div>
              <p className="text-[9px] uppercase tracking-wider">Forger</p>
              <p className="mt-0.5 text-ink">{shortAddress(forger)}</p>
            </div>
          )}
          {typeof createdAt === "number" && createdAt > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider">Forged</p>
              <p className="mt-0.5 text-ink">
                {new Date(createdAt * 1000).toLocaleString()}
              </p>
            </div>
          )}
          {sourceHashes.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider">
                Source hashes ({sourceHashes.length})
              </p>
              <ul className="mt-1 space-y-1">
                {sourceHashes.map((h) => (
                  <li key={h} className="break-all text-ink/80">
                    {shortHash(h)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {explorerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ember hover:underline"
            >
              <ExternalLink size={10} />
              {link.label}
            </a>
          ))}
          {children}
        </div>
      )}
    </section>
  );
}

function shortHash(h: string) {
  const clean = h.startsWith("0x") ? h.slice(2) : h;
  if (clean.length < 16) return h;
  return `${clean.slice(0, 8)}…${clean.slice(-4)}`;
}
