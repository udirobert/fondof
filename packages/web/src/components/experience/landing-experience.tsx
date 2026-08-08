"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ExternalLink } from "lucide-react";
import { ExperienceCanvas } from "./experience-canvas";
import { SplitTitle } from "./split-title";
import { StaggerGrid } from "./stagger-grid";
import { AmbientToggle } from "./ambient-toggle";
import { PipelineStrip } from "./pipeline-strip";
import { ProblemStrip } from "./problem-strip";

gsap.registerPlugin(ScrollTrigger);

const chapters = [
  {
    id: "enter",
    anchor: "gl-enter",
    eyebrow: "Personal skills for your repo",
    title: "fondof",
    body: "fondof the pod. fond of the blog. Paste what you learn — then forge a skill fitted to your codebase, not a directory clone.",
  },
  {
    id: "arrival",
    anchor: "gl-arrival",
    eyebrow: "Ingest",
    title: "From what you learn",
    body: "Podcasts via ElevenLabs, articles via Firecrawl. Discrete, actionable ideas — material you can select, not a wall of summary.",
  },
  {
    id: "fold",
    anchor: "gl-fold",
    eyebrow: "Forge",
    title: "Fitted to your code",
    body: "Customised to YOUR stack, conventions, and paths. Multi-source composition with a provenance trail from segment to skill.",
  },
  {
    id: "settle",
    anchor: "gl-settle",
    eyebrow: "SkillPool",
    title: "Useful becomes proven",
    body: "Publish on Monad when you’re ready. Signal = backing + usage − challenge losses. Next: attach what the skill resulted in — better UI, cleaner PR, real repo delta.",
  },
] as const;

const STANCE = [
  {
    not: "A skill marketplace",
    is: "A forge — we don’t list or sell skills. Try ClawHub to browse.",
  },
  {
    not: "A registry",
    is: "We don’t index the ecosystem. Try VoltAgent/awesome-agent-skills for catalogs.",
  },
  {
    not: "A tokenization protocol",
    is: "No tokens, no bonding curves. Provenance + economic quality — not pricing theater.",
  },
  {
    not: "An AI security scanner",
    is: "Contestable reputation, not injection firewalls. Forge skills you understand for your repo.",
  },
  {
    not: "Generic skill templates",
    is: "Every output is personalised — forged from source material and fitted to a specific repo.",
  },
];

const MONAD_POINTS = [
  {
    title: "Per-use tracking",
    body: "Recording every agent invocation only works at ~10K TPS economics.",
  },
  {
    title: "300ms finality",
    body: "Quality signals update in real time as usage and challenges land.",
  },
  {
    title: "Why not slower chains",
    body: "This protocol can’t exist where every write is expensive or slow.",
  },
];

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
            { opacity: 0.35, y: 22 },
            {
              opacity: 1,
              y: 0,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top 82%",
                end: "top 48%",
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
    <div ref={rootRef} className="relative atmosphere overflow-x-clip min-h-screen">
      <AmbientToggle progress={progress} disabled={reducedMotion} />

      <ExperienceCanvas
        progress={progress}
        reducedMotion={reducedMotion}
        rootRef={rootRef}
      />

      {reducedMotion && (
        <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-40">
          <div className="h-40 w-40 rotate-45 rounded-2xl bg-ember/30 ember-glow" />
        </div>
      )}

      <div className="relative z-10">
        {/* Hero */}
        <section
          data-chapter
          className="relative flex min-h-[88vh] flex-col justify-center px-6 pt-24 pb-12"
        >
          <div
            data-gl-anchor="gl-enter"
            className="pointer-events-none absolute right-[4%] top-[16%] h-[46vmin] w-[46vmin] max-w-lg"
            aria-hidden
          />

          <div data-chapter-copy className="copy-plate relative max-w-xl md:ml-[6%] p-8 sm:p-10">
            <p className="text-xs uppercase tracking-[0.2em] text-ember mb-3">
              {chapters[0].eyebrow}
            </p>
            <SplitTitle
              text={chapters[0].title}
              as="h1"
              className="font-serif text-6xl sm:text-7xl md:text-8xl text-ink leading-[0.95]"
            />
            <p className="mt-6 text-lg text-foreground-secondary leading-relaxed">
              {chapters[0].body}
            </p>
            <div className="pointer-events-auto mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/canvas"
                className="inline-flex items-center gap-2 rounded-full bg-ember px-5 py-2.5 text-sm font-medium text-paper hover:bg-ember-hot transition-colors ember-glow"
              >
                Start forging
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/canvas?sample=1"
                className="rounded-full border border-ink/12 bg-paper/80 px-4 py-2.5 text-sm text-ink hover:border-ember/40 transition-colors"
              >
                Try sample in 10s
              </Link>
              <a
                href="#problem"
                className="text-sm text-muted hover:text-ink transition-colors"
              >
                Scroll the story
              </a>
            </div>
          </div>

          <div id="pipeline" className="mt-14 md:mt-16">
            <PipelineStrip />
          </div>
        </section>

        {/* Problem */}
        <section id="problem" data-chapter className="relative px-6 py-16">
          <div data-chapter-copy>
            <ProblemStrip />
          </div>
        </section>

        {/* Story chapters + WebGL */}
        {chapters.slice(1).map((chapter, idx) => {
          const i = idx + 1;
          return (
            <section
              key={chapter.id}
              data-chapter
              className="relative flex min-h-[70vh] flex-col justify-center px-6 py-16"
            >
              {chapter.anchor && (
                <div
                  data-gl-anchor={chapter.anchor}
                  className={`pointer-events-none absolute h-[38vmin] w-[38vmin] max-w-md ${
                    i % 2 === 0
                      ? "right-[5%] top-1/2 -translate-y-1/2"
                      : "left-[6%] top-1/2 -translate-y-1/2"
                  }`}
                  aria-hidden
                />
              )}

              <div
                data-chapter-copy
                className={`copy-plate relative max-w-lg p-7 sm:p-9 ${
                  i % 2 === 0 ? "md:ml-[8%]" : "md:ml-auto md:mr-[8%]"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-ember mb-3">
                  {chapter.eyebrow}
                </p>
                <SplitTitle
                  text={chapter.title}
                  as="h1"
                  className="font-serif text-3xl sm:text-4xl md:text-5xl text-ink leading-[1.05]"
                />
                <p className="mt-4 text-base sm:text-lg text-foreground-secondary leading-relaxed">
                  {chapter.body}
                </p>
              </div>
            </section>
          );
        })}

        {/* Why Monad — utility, not chain cosplay */}
        <section data-chapter className="relative px-6 py-20">
          <div data-chapter-copy className="mx-auto max-w-4xl">
            <p className="text-xs uppercase tracking-[0.2em] text-ember mb-3 text-center">
              Why Monad
            </p>
            <SplitTitle
              text="Quality signals need speed"
              as="h2"
              className="font-serif text-3xl sm:text-5xl text-ink text-center leading-tight mb-8"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {MONAD_POINTS.map((point) => (
                <div key={point.title} className="copy-plate p-5">
                  <h3 className="font-serif text-lg text-ink mb-1.5">
                    {point.title}
                  </h3>
                  <p className="text-sm text-foreground-secondary leading-relaxed">
                    {point.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stance */}
        <section data-chapter className="relative px-6 py-20">
          <div data-chapter-copy className="mx-auto max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-ember mb-3 text-center">
              Positioning
            </p>
            <SplitTitle
              text="What fondof is not"
              as="h2"
              className="font-serif text-3xl sm:text-5xl text-ink text-center leading-tight mb-10"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {STANCE.map((row) => (
                <div key={row.not} className="copy-plate p-5">
                  <p className="text-xs font-mono text-muted mb-1 line-through decoration-muted/50">
                    not {row.not}
                  </p>
                  <p className="text-sm text-ink leading-relaxed">{row.is}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Visual ideas grid — product metaphor */}
        <section
          data-chapter
          className="relative flex flex-col justify-center gap-10 py-16 px-4"
        >
          <div data-chapter-copy className="mx-auto max-w-xl text-center copy-plate p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-ember mb-3">
              On the canvas
            </p>
            <SplitTitle
              text="Ideas become selectable material"
              as="h2"
              className="font-serif text-3xl sm:text-4xl text-ink leading-tight"
            />
            <p className="mt-3 text-foreground-secondary">
              Same language as the product: shards you choose, threads you follow,
              folds you commit.
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
                    className="rounded-xl border border-ink/10 bg-paper p-4 font-serif text-ink shadow-sm"
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* CTA + links */}
        <section
          data-chapter
          data-chapter-copy
          className="flex flex-col items-center justify-center px-6 py-24 text-center"
        >
          <div className="copy-plate max-w-2xl p-10 sm:p-12">
            <p className="text-xs uppercase tracking-[0.2em] text-ember mb-4">
              Start forging
            </p>
            <SplitTitle
              text="Bring a source. Leave with a skill for your repo."
              as="h2"
              className="font-serif text-3xl sm:text-5xl text-ink leading-tight"
            />
            <p className="mt-5 text-foreground-secondary">
              Paste a source or state a need. Forge something personalised.
              Publish when you want proof on SkillPool — outcomes come next.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/canvas"
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-ember px-6 py-3 text-sm font-medium text-paper hover:bg-ember-hot transition-colors ember-glow"
              >
                Start forging
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/canvas?sample=1"
                className="pointer-events-auto rounded-full border border-ink/12 bg-paper/80 px-5 py-3 text-sm text-ink hover:border-ember/40 transition-colors"
              >
                Try sample
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted">
              <a
                href="https://fondof-api.trustfall.workers.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-ink transition-colors"
              >
                API <ExternalLink size={10} />
              </a>
              <a
                href="https://github.com/udirobert/fondof"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-ink transition-colors"
              >
                GitHub <ExternalLink size={10} />
              </a>
              <span className="font-mono text-[10px] sm:text-xs break-all">
                0x75545e2C…8b19
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
