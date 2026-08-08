"use client";

const STEPS = [
  {
    label: "01 Ingest",
    title: "Extract",
    body: "Paste a podcast or blog. Ideas come out as actionable patterns — not a summary dump.",
  },
  {
    label: "02 Forge",
    title: "Fit",
    body: "Compose a skill for YOUR repo — stack, conventions, dependencies.",
  },
  {
    label: "03 Publish",
    title: "SkillPool",
    body: "On Monad, signal = backing + usage − challenge losses. Quality is measured.",
  },
  {
    label: "04 Challenge",
    title: "Settle",
    body: "Stake against weak skills. Benchmarks settle disputes. Clones lose ground.",
  },
];

/** Product pipeline — utility first, same plate language as the rest of the floor. */
export function PipelineStrip() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4 px-4">
      {STEPS.map((step, i) => (
        <article
          key={step.label}
          className="copy-plate relative p-5 overflow-hidden"
        >
          <span className="absolute -right-2 -top-3 font-serif text-5xl text-ember/15 select-none">
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="text-[10px] uppercase tracking-[0.18em] text-ember mb-2">
            {step.label}
          </p>
          <h3 className="font-serif text-xl text-ink mb-1.5">{step.title}</h3>
          <p className="text-sm text-foreground-secondary leading-relaxed">
            {step.body}
          </p>
        </article>
      ))}
    </div>
  );
}
