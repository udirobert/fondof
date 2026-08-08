"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CELLS = [
  "podcast fragment",
  "async boundary",
  "error taxonomy",
  "retry budget",
  "trace context",
  "cache policy",
  "prefetch window",
  "skill worthiness",
  "repo fit",
  "provenance",
  "composition",
  "settle",
];

/**
 * Codrops-inspired CSS 3D staggered grid — scroll-scrubbed rotateX / z / skew.
 */
export function StaggerGrid() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = root.querySelectorAll<HTMLElement>("[data-grid-item]");

    const ctx = gsap.context(() => {
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const leftSide =
          rect.left + rect.width / 2 < window.innerWidth / 2;

        gsap
          .timeline({
            scrollTrigger: {
              trigger: item,
              start: "top bottom+=8%",
              end: "bottom top-=15%",
              scrub: true,
            },
          })
          .fromTo(
            item,
            {
              z: 220,
              rotateX: 68,
              rotateZ: leftSide ? 6 : -6,
              xPercent: leftSide ? -28 : 28,
              skewX: leftSide ? -14 : 14,
              yPercent: 70,
              filter: "blur(6px) brightness(0.35)",
              opacity: 0.2,
            },
            {
              z: 0,
              rotateX: 0,
              rotateZ: 0,
              xPercent: 0,
              skewX: 0,
              yPercent: 0,
              filter: "blur(0px) brightness(1)",
              opacity: 1,
              ease: "sine",
            },
          )
          .to(item, {
            z: 160,
            rotateX: -42,
            rotateZ: leftSide ? -2 : 2,
            xPercent: leftSide ? -12 : 12,
            skewX: leftSide ? 8 : -8,
            filter: "blur(3px) brightness(0.45)",
            opacity: 0.35,
            ease: "sine.in",
          });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="stagger-grid-stage relative mx-auto w-full max-w-5xl px-4"
      style={{ perspective: 900 }}
      aria-hidden
    >
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4"
        style={{ transformStyle: "preserve-3d" }}
      >
        {CELLS.map((label, i) => (
          <div
            key={label}
            data-grid-item
            className="stagger-grid-item relative aspect-[4/3] rounded-lg border border-paper/10 bg-gradient-to-br from-paper/15 to-paper/[0.03] p-3 overflow-hidden will-change-transform"
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: "50% 100%",
            }}
          >
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember/40 to-transparent" />
            <span className="font-mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-2 font-serif text-sm sm:text-base text-paper/90 leading-snug">
              {label}
            </p>
            <span className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-ember/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
