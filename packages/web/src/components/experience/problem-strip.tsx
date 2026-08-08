"use client";

const PAINS = [
  {
    stat: "20,000+",
    label: "agent skills exist",
    detail: "Directories full of clones and slop — hard to tell useful from noise.",
  },
  {
    stat: "Stars",
    label: "lag as a signal",
    detail: "Popularity is late. It doesn’t prove a skill fits your repo — or is safe to paste into an agent.",
  },
  {
    stat: "Yours",
    label: "is what’s missing",
    detail: "Personalised skills for your stack, with a path to show what they actually improved.",
  },
];

/** Problem framing — supply distrust as context; personalised craft as desire. */
export function ProblemStrip() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <div className="copy-plate p-6 sm:p-8 mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-ember mb-2">
          The problem
        </p>
        <p className="font-serif text-2xl sm:text-3xl text-ink leading-snug max-w-2xl">
          Generic skills don’t fit your code. Stars don’t prove quality. You
          need something forged for your repo — and a way to show it helped.
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
