"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

interface TipProps {
  /** Glossary key or free-form tip text */
  tip: GlossaryKey | string;
  children: ReactNode;
  className?: string;
}

/**
 * Hover/focus tooltip for product jargon — keeps labels short, teaches on demand.
 * On touch devices, tapping a non-interactive label toggles the tooltip
 * (outside tap dismisses); tips wrapping buttons never hijack the tap.
 *
 * Accessibility: when the trigger is a single focusable element (button, link,
 * input, etc.), the tooltip id is attached to that element via aria-describedby
 * so screen readers announce it on focus. For non-focusable labels the tooltip
 * is still available to pointer/hover users.
 */
export function Tip({ tip, children, className = "" }: TipProps) {
  const label = tip in GLOSSARY ? GLOSSARY[tip as GlossaryKey] : tip;
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  // Dismiss on outside tap while open
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Touch-only tap toggle. Never hijack taps on interactive children.
  const handleClick = (e: React.MouseEvent) => {
    if (!window.matchMedia("(hover: none)").matches) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, [role='button']")) {
      return;
    }
    setOpen((v) => !v);
  };

  const childArray = Children.toArray(children);
  const firstChild = childArray[0];
  const onlyChild = childArray.length === 1;
  const triggerIsElement = onlyChild && isValidElement(firstChild);
  let trigger: ReactNode = children;
  if (triggerIsElement) {
    const child = firstChild as ReactElement<Record<string, unknown>>;
    const existing = (child.props["aria-describedby"] as string | undefined);
    trigger = cloneElement(child, {
      "aria-describedby": open ? (existing ?? tooltipId) : existing,
    });
  }

  return (
    <span
      ref={ref}
      className={`group/tip relative inline-flex max-w-full ${className}`}
      onClick={handleClick}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      {trigger}
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!open}
        className={`pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[60] w-max max-w-[16rem] -translate-x-1/2 rounded-md border border-ink/10 bg-ink px-2.5 py-1.5 text-left text-[11px] leading-snug font-normal normal-case tracking-normal text-paper shadow-lg transition-opacity duration-150 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
