"use client";

import { motion } from "framer-motion";

interface ConnectionLineProps {
  /** Start coordinates */
  x1: number;
  y1: number;
  /** End coordinates */
  x2: number;
  y2: number;
  /** Match type affects color */
  type: "novel" | "partial" | "conflict";
  /** Score affects opacity */
  score: number;
  /** Delay before drawing */
  delay?: number;
}

/**
 * A hand-drawn-style connection line between an idea and a repo.
 * Animates by drawing itself in, like ink being laid down.
 */
export function ConnectionLine({
  x1,
  y1,
  x2,
  y2,
  type,
  score,
  delay = 0,
}: ConnectionLineProps) {
  const color =
    type === "novel"
      ? "var(--line-novel)"
      : type === "partial"
        ? "var(--line-partial)"
        : "var(--line-conflict)";

  // Bezier control points for a gentle curve
  const dx = x2 - x1;
  const cp1x = x1 + dx * 0.4;
  const cp2x = x1 + dx * 0.6;

  const path = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;

  return (
    <motion.path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={Math.max(0.3, score * 0.8)}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
    />
  );
}

/**
 * SVG container for connection lines — positioned over the canvas.
 */
export function ConnectionLayer({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
