"use client";

interface MatchBeamProps {
  /** SVG coordinates: start point */
  x1: number;
  y1: number;
  /** SVG coordinates: end point */
  x2: number;
  y2: number;
  /** Relevance score (0-1) affects opacity and width */
  score: number;
  /** Type affects color */
  type: "novel" | "partial" | "conflict";
}

/**
 * Animated beam connecting an idea node to a repo.
 * Rendered as an SVG path with animated dash flow.
 */
export function MatchBeam({ x1, y1, x2, y2, score, type }: MatchBeamProps) {
  const color =
    type === "novel"
      ? "var(--beam-novel)"
      : type === "partial"
        ? "var(--beam-partial)"
        : "var(--beam-conflict)";

  const opacity = Math.max(0.3, score);
  const strokeWidth = 1 + score * 2;

  // Bezier curve control points for a nice arc
  const midX = (x1 + x2) / 2;
  const cpOffset = Math.abs(x2 - x1) * 0.2;

  const path = `M ${x1} ${y1} C ${midX - cpOffset} ${y1}, ${midX + cpOffset} ${y2}, ${x2} ${y2}`;

  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      opacity={opacity}
      className="beam-animated"
      strokeLinecap="round"
    />
  );
}

/**
 * SVG container for beams — overlays the flow canvas.
 */
export function BeamLayer({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
