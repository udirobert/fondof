import Link from "next/link";
import { ArrowRight, Podcast, GitBranch, Sparkles, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center px-6 pt-28 pb-20 text-center">
        <p className="text-sm text-muted mb-4 tracking-wide uppercase">
          A skill forge, not a marketplace
        </p>
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl max-w-3xl leading-[1.1] text-foreground">
          Turn what you learn into what your agents know
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-foreground-secondary">
          Podcasts and blogs are full of ideas. Your projects need skills.
          fondof connects the two — extracting patterns from content and forging
          them into skills fitted to your code.
        </p>
        <div className="mt-10 flex gap-3">
          <Link
            href="/canvas"
            className="group flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all hover:gap-3"
          >
            Open Canvas
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://github.com/udirobert/fondof"
            className="rounded-full px-5 py-2.5 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors"
          >
            Read the docs
          </a>
        </div>
      </section>

      {/* How it works — editorial style */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="grid gap-16 md:gap-20">
          <FlowStep
            number="01"
            title="Ingest"
            description="Paste a podcast episode or blog post. fondof transcribes the audio, extracts the clean text, and identifies the discrete ideas worth capturing."
            icon={Podcast}
          />
          <FlowStep
            number="02"
            title="Discover"
            description="Each idea is matched against your connected repositories. You'll see where it applies, what already exists, and whether it's worth forging into a skill or just applying directly."
            icon={GitBranch}
          />
          <FlowStep
            number="03"
            title="Forge"
            description="Select the ideas that matter. fondof composes them into a skill that knows your stack — your conventions, your dependencies, your architecture. Multi-source, environment-fitted."
            icon={Sparkles}
          />
          <FlowStep
            number="04"
            title="Attest"
            description="Publish with provenance. The source chain — from podcast segment to extracted idea to forged skill — is recorded immutably. No wallet, no gas, no blockchain knowledge required."
            icon={Shield}
          />
        </div>
      </section>

      {/* What we're not */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="font-serif text-3xl text-center mb-3">
          Not everything. Just this.
        </h2>
        <p className="text-center text-foreground-secondary mb-12">
          fondof is opinionated about what it is and isn&apos;t.
        </p>

        <div className="space-y-4">
          <Distinction
            not="A skill marketplace"
            is="A skill forge — you bring sources, we help you craft"
          />
          <Distinction
            not="A skill aggregator"
            is="A bridge — we search the ecosystem to inform your work, not to catalog it"
          />
          <Distinction
            not="A tokenization protocol"
            is="A provenance layer — proving lineage, not pricing it"
          />
          <Distinction
            not="Generic output"
            is="Environment-fitted — every skill respects your specific codebase"
          />
        </div>
      </section>

      {/* Two modes */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="paper p-8">
            <p className="text-xs text-muted uppercase tracking-wider mb-4">
              Content-first
            </p>
            <p className="font-serif text-xl leading-snug mb-3">
              &ldquo;I just finished a podcast — where do these ideas
              apply?&rdquo;
            </p>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              Paste the URL. fondof extracts ideas and shows which of your
              repos each one maps to — with specifics about where and why.
            </p>
          </div>
          <div className="paper p-8">
            <p className="text-xs text-muted uppercase tracking-wider mb-4">
              Need-first
            </p>
            <p className="font-serif text-xl leading-snug mb-3">
              &ldquo;I need better error handling — what exists and what should
              I build?&rdquo;
            </p>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              Describe the need. fondof finds existing skills, identifies gaps,
              and suggests source material that could fill them.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center">
        <p className="text-sm text-muted">
          Built for Monad Blitz. Provenance on Monad.
        </p>
      </footer>
    </div>
  );
}

function FlowStep({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-accent-soft">
        <Icon size={18} className="text-accent" />
      </div>
      <div>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-xs font-mono text-muted">{number}</span>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-foreground-secondary leading-relaxed max-w-lg">
          {description}
        </p>
      </div>
    </div>
  );
}

function Distinction({ not, is }: { not: string; is: string }) {
  return (
    <div className="flex items-start gap-4 py-3">
      <span className="flex-shrink-0 text-xs font-mono text-muted bg-background-subtle px-2 py-1 rounded">
        not
      </span>
      <div>
        <p className="text-foreground-secondary line-through decoration-muted/40">
          {not}
        </p>
        <p className="text-foreground mt-0.5">{is}</p>
      </div>
    </div>
  );
}
