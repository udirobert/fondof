"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface SplitTitleProps {
  text: string;
  as?: "h1" | "h2";
  className?: string;
  /** Scrub reveal from below (Codrops-style) */
  scrub?: boolean;
}

/**
 * Lightweight SplitText stand-in — char spans + GSAP ScrollTrigger.
 * Avoids GSAP Club dependency while matching the Codrops kinetic feel.
 */
export function SplitTitle({
  text,
  as: Tag = "h1",
  className = "",
  scrub = true,
}: SplitTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const chars = el.querySelectorAll<HTMLElement>("[data-char]");
    const ctx = gsap.context(() => {
      gsap.from(chars, {
        yPercent: 120,
        autoAlpha: 0,
        rotateX: 40,
        ease: "sine.out",
        stagger: { each: 0.03, from: "center" },
        scrollTrigger: scrub
          ? {
              trigger: el,
              start: "top 85%",
              end: "top 45%",
              scrub: true,
            }
          : {
              trigger: el,
              start: "top 80%",
              toggleActions: "play none none none",
            },
      });
    }, el);

    return () => ctx.revert();
  }, [text, scrub]);

  const words = text.split(" ");

  return (
    <Tag
      ref={ref}
      className={`split-title ${className}`}
      aria-label={text}
      style={{ perspective: 600 }}
    >
      {words.map((word, wi) => (
        <span key={`${word}-${wi}`} className="inline-block whitespace-nowrap mr-[0.28em] last:mr-0">
          {Array.from(word).map((char, ci) => (
            <span
              key={`${wi}-${ci}`}
              data-char
              className="inline-block will-change-transform"
              style={{ transformOrigin: "50% 100%" }}
            >
              {char}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
