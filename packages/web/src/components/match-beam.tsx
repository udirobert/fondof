"use client";

import { motion } from "framer-motion";

interface ConnectionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: "novel" | "partial" | "conflict";
  score: number;
  delay?: number;
  label?: string;
}

/**
 * Luminous match thread — width/opacity encode score; color+dash encode type.
 */
export function ConnectionLine({
  x1,
  y1,
  x2,
  y2,
  type,
  score,
  delay = 0,
  label,
}: ConnectionLineProps) {
  const color =
    type === "novel"
      ? "var(--line-novel)"
      : type === "partial"
        ? "var(--line-partial)"
        : "var(--line-conflict)";

  const dx = x2 - x1;
  const cp1x = x1 + dx * 0.4;
  const cp2x = x1 + dx * 0.6;
  const path = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
  const strokeWidth = 1.25 + score * 2.5;
  const dash = type === "conflict" ? "4 4" : type === "partial" ? "8 4" : undefined;

  return (
    <g>
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth + 4}
        strokeLinecap="round"
        opacity={0.12}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dash}
        opacity={Math.max(0.35, score * 0.9)}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay, ease: [0.4, 0, 0.2, 1] }}
      >
        {label ? <title>{label}</title> : null}
      </motion.path>
    </g>
  );
}

export function ConnectionLayer({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <defs>
        <filter id="thread-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#thread-glow)">{children}</g>
    </svg>
  );
}
