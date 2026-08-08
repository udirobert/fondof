"use client";

import type { ReactNode } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

interface TipProps {
  /** Glossary key or free-form tip text */
  tip: GlossaryKey | string;
  children: ReactNode;
  className?: string;
}

/**
 * Hover/focus tooltip for product jargon — keeps labels short, teaches on demand.
 */
export function Tip({ tip, children, className = "" }: TipProps) {
  const label = tip in GLOSSARY ? GLOSSARY[tip as GlossaryKey] : tip;

  return (
    <span className={`group/tip relative inline-flex max-w-full ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[60] w-max max-w-[16rem] -translate-x-1/2 rounded-md border border-ink/10 bg-ink px-2.5 py-1.5 text-left text-[11px] leading-snug font-normal normal-case tracking-normal text-paper opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 [@media(hover:none)]:group-active/tip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
