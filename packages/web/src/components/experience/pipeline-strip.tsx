"use client";

const STEPS = [
  {
    label: "01 Ingest",
    title: "Extract",
    body: "Paste a podcast or blog — or state a need. Ideas come out as actionable patterns.",
  },
  {
    label: "02 Forge",
    title: "Personalise",
    body: "Compose a skill for YOUR repo — stack, conventions, paths. Specifically useful, not a clone.",
  },
  {
    label: "03 Publish",
    title: "Prove use",
    body: "SkillPool on Monad: signal = backing + usage − challenge losses. Contestable quality.",
  },
  {
    label: "04 Outcomes",
    title: "Show results",
    body: "Next: attach what improved — PR, UI, repo delta — so quality means it helped.",
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
