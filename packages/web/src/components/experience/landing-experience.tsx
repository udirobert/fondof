"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ExperienceCanvas } from "./experience-canvas";
import { SplitTitle } from "./split-title";
import { StaggerGrid } from "./stagger-grid";
import { AmbientToggle } from "./ambient-toggle";

gsap.registerPlugin(ScrollTrigger);

const chapters = [
  {
    id: "enter",
    anchor: "gl-enter",
    eyebrow: null,
    title: "fondof",
    body: "Turn what you learn into what your agents know.",
  },
  {
    id: "arrival",
    anchor: "gl-arrival",
    eyebrow: "Ingest",
    title: "Content arrives as paper",
    body: "Podcasts and posts become discrete ideas — material you can hold, sort, and choose.",
  },
  {
    id: "fold",
    anchor: "gl-fold",
    eyebrow: "Forge",
    title: "Selected ideas fold into form",
    body: "Compose multi-source patterns into one skill fitted to your stack and conventions.",
  },
  {
    id: "settle",
    anchor: "gl-settle",
    eyebrow: "Settle",
    title: "Capability lands in your repo",
    body: "Threads show where it applies. The skill settles where your agents actually work.",
  },
  {
    id: "stance",
    anchor: null,
    eyebrow: "Not a marketplace",
    title: "A forge, not a catalog",
    body: "You bring sources. We help you craft. Provenance without wallets, gas, or chain theater.",
  },
] as const;

export function LandingExperience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.55,
        onUpdate: (self) => setProgress(self.progress),
      });

      if (!reducedMotion) {
        gsap.utils.toArray<HTMLElement>("[data-chapter-copy]").forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0.2, y: 28 },
            {
              opacity: 1,
              y: 0,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top 78%",
                end: "top 40%",
                scrub: true,
              },
            },
          );
        });
      }
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div ref={rootRef} className="relative bg-ink overflow-x-clip">
      <AmbientToggle progress={progress} disabled={reducedMotion} />

      {/* Lusion: absolute canvas that translates with scroll (not fixed) */}
      <ExperienceCanvas
        progress={progress}
        reducedMotion={reducedMotion}
        rootRef={rootRef}
      />

      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 80% 65% at 50% 42%, transparent 10%, oklch(0.1 0.01 55 / 0.35) 100%)",
        }}
      />

      {reducedMotion && (
        <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
          <div className="h-36 w-36 rotate-45 rounded-xl bg-ember/70 ember-glow" />
        </div>
      )}

      <div className="relative z-10">
        {chapters.map((chapter, i) => (
          <section
            key={chapter.id}
            data-chapter
            className="relative flex min-h-screen flex-col justify-end md:justify-center px-6 pb-24 md:pb-0"
          >
            {/* Invisible GL anchor — WebGL objects lock to this box */}
            {chapter.anchor && (
              <div
                data-gl-anchor={chapter.anchor}
                className={`pointer-events-none absolute h-[40vmin] w-[40vmin] max-w-md ${
                  i % 2 === 0
                    ? "right-[6%] top-1/2 -translate-y-1/2"
                    : "left-[8%] top-1/2 -translate-y-1/2"
                }`}
                aria-hidden
              />
            )}

            <div
              data-chapter-copy
              className={`relative max-w-xl ${
                i % 2 === 0 ? "md:ml-[8%]" : "md:ml-auto md:mr-[8%]"
              }`}
            >
              {chapter.eyebrow && (
                <p className="text-xs uppercase tracking-[0.2em] text-ember mb-3">
                  {chapter.eyebrow}
                </p>
              )}
              <SplitTitle
                text={chapter.title}
                as="h1"
                className={`font-serif text-paper leading-[1.05] min-w-0 [overflow-wrap:anywhere] ${
                  i === 0
                    ? "text-6xl sm:text-7xl md:text-8xl"
                    : "text-4xl sm:text-5xl md:text-6xl"
                }`}
              />
              <p className="mt-5 max-w-md text-lg text-foreground-secondary leading-relaxed">
                {chapter.body}
              </p>
              {i === 0 && (
                <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/canvas"
                    className="rounded-full bg-ember px-5 py-2.5 text-sm font-medium text-ink hover:bg-ember-hot transition-colors ember-glow"
                  >
                    Enter canvas
                  </Link>
                  <span className="self-center text-xs text-muted">
                    Scroll to see the forge
                  </span>
                </div>
              )}
            </div>
          </section>
        ))}

        {/* Codrops staggered 3D grid beat */}
        <section
          data-chapter
          className="relative min-h-screen flex flex-col justify-center gap-12 py-24 px-4"
        >
          <div data-chapter-copy className="mx-auto max-w-xl text-center px-2">
            <p className="text-xs uppercase tracking-[0.2em] text-ember mb-3">
              Ideas in space
            </p>
            <SplitTitle
              text="A grid of what you learned"
              as="h2"
              className="font-serif text-3xl sm:text-5xl text-paper leading-tight"
            />
            <p className="mt-4 text-foreground-secondary">
              Fragments stagger into view — the same language your canvas uses when
              ideas arrive.
            </p>
          </div>
          {!reducedMotion ? (
            <StaggerGrid />
          ) : (
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
              {["retry", "taxonomy", "trace", "compose", "fit", "attest"].map(
                (label) => (
                  <div
                    key={label}
                    className="rounded-lg border border-paper/10 bg-paper/5 p-4 font-serif text-paper"
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        <section
          data-chapter
          data-chapter-copy
          className="flex min-h-[70vh] flex-col items-center justify-center px-6 pb-28 text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-ember mb-4">
            The floor is ready
          </p>
          <SplitTitle
            text="Bring a source. Leave with a skill."
            as="h2"
            className="font-serif text-4xl sm:text-5xl text-paper max-w-2xl leading-tight"
          />
          <p className="mt-5 max-w-md text-foreground-secondary">
            The canvas is the living version of what you just saw — paper, threads,
            fold, settle.
          </p>
          <Link
            href="/canvas"
            className="pointer-events-auto mt-10 rounded-full bg-ember px-6 py-3 text-sm font-medium text-ink hover:bg-ember-hot transition-colors ember-glow"
          >
            Enter canvas
          </Link>
        </section>
      </div>
    </div>
  );
}
