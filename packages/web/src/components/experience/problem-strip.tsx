"use client";

const PAINS = [
  {
    stat: "20,000+",
    label: "agent skills exist",
    detail: "Most are hard to trust at a glance.",
  },
  {
    stat: "75%",
    label: "are clones",
    detail: "Copy-paste with no provenance trail.",
  },
  {
    stat: "0",
    label: "shared quality score",
    detail: "Usage and challenges don’t settle into signal.",
  },
];

/** Problem framing — numbers from product brief only. */
export function ProblemStrip() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <div className="copy-plate p-6 sm:p-8 mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-ember mb-2">
          The problem
        </p>
        <p className="font-serif text-2xl sm:text-3xl text-ink leading-snug max-w-2xl">
          Skills flood the ecosystem. Quality is unmeasured. You can&apos;t trace
          where a skill&apos;s thinking came from.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PAINS.map((pain) => (
          <div key={pain.label} className="copy-plate p-5">
            <p className="font-serif text-3xl sm:text-4xl text-ember tabular-nums">
              {pain.stat}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{pain.label}</p>
            <p className="mt-1 text-sm text-foreground-secondary leading-relaxed">
              {pain.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
