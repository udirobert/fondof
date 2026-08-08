import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl max-w-4xl">
          The bridge between what you{" "}
          <span className="text-accent">learn</span> and what your agents{" "}
          <span className="text-accent">do</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          Connect the content you consume — podcasts, blogs, technical talks —
          with the projects you&apos;re building. Forge best-in-class skills
          fitted to your specific coding environment.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/canvas"
            className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-dim transition-colors"
          >
            Try the Canvas
          </Link>
          <a
            href="https://github.com/udirobert/fondof"
            className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-surface transition-colors"
          >
            View Source
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Step number="1" title="Ingest" description="Paste a podcast or blog URL. fondof transcribes, extracts ideas, and identifies actionable patterns." />
          <Step number="2" title="Discover" description="Ideas are matched against your repos. See what already exists, what's novel, and where it applies." />
          <Step number="3" title="Forge" description="Compose skills from multiple sources, fitted to your stack, conventions, and existing patterns." />
          <Step number="4" title="Attest" description="Publish with verifiable provenance on Monad. The blockchain is completely invisible." />
        </div>
      </section>

      {/* Two entry points */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">Two entry points</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-8">
            <div className="text-2xl mb-3">Content-first</div>
            <p className="text-muted">
              &ldquo;I just listened to a great podcast — where do these ideas apply
              across my projects?&rdquo;
            </p>
            <div className="mt-6 font-mono text-xs text-muted bg-background rounded-lg p-4">
              fondof ingest https://podcast.example/ep-42.mp3
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-8">
            <div className="text-2xl mb-3">Need-first</div>
            <p className="text-muted">
              &ldquo;I have a problem in my code — what skills exist, and what source
              material could fill the gap?&rdquo;
            </p>
            <div className="mt-6 font-mono text-xs text-muted bg-background rounded-lg p-4">
              fondof need &quot;better error handling in async Rust&quot;
            </div>
          </div>
        </div>
      </section>

      {/* What we're NOT */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">What fondof is NOT</h2>
        <p className="text-center text-muted mb-12 max-w-2xl mx-auto">
          We occupy a specific position in the agent skills ecosystem.
          If you&apos;re looking for something else, we&apos;ll point you in the right direction.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <NotCard
            title="Not a skill marketplace"
            description="We don't host or sell pre-made skills."
            redirect="ClawHub, LobeHub, skills.sh"
          />
          <NotCard
            title="Not a skill aggregator"
            description="We don't index or deduplicate the ecosystem."
            redirect="VoltAgent/awesome-agent-skills, AmazingAng/skilldb"
          />
          <NotCard
            title="Not a tokenization protocol"
            description="No tokens, bonding curves, or per-request payments."
            redirect="x402 Protocol, ERC-8239"
          />
          <NotCard
            title="Not a domain-specific suite"
            description="We're domain-agnostic — works for any stack, any content."
            redirect="OKX OnchainOS, Allium AgentHub"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">fondof IS for when you...</h2>
        <ul className="text-left max-w-xl mx-auto space-y-3 text-muted">
          <li className="flex gap-3">
            <span className="text-success">&#9670;</span>
            Listen to a podcast and want to turn insights into skills for YOUR specific project
          </li>
          <li className="flex gap-3">
            <span className="text-success">&#9670;</span>
            Have a need and want to know if something already covers it — or should forge new
          </li>
          <li className="flex gap-3">
            <span className="text-success">&#9670;</span>
            Want provenance — know exactly where a skill&apos;s thinking came from
          </li>
          <li className="flex gap-3">
            <span className="text-success">&#9670;</span>
            Want environment-fitted skills that respect your stack and conventions
          </li>
          <li className="flex gap-3">
            <span className="text-success">&#9670;</span>
            Want to compose skills from multiple sources, not just copy one file
          </li>
        </ul>
        <div className="mt-12">
          <Link
            href="/canvas"
            className="rounded-lg bg-accent px-8 py-4 text-base font-medium text-white hover:bg-accent-dim transition-colors"
          >
            Open the Flow Canvas
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        <p>Built for Monad Blitz. Provenance attested on Monad.</p>
      </footer>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-sm font-mono text-accent">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}

function NotCard({ title, description, redirect }: { title: string; description: string; redirect: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted mb-2">{description}</p>
      <p className="text-xs text-muted">
        Try instead: <span className="text-foreground">{redirect}</span>
      </p>
    </div>
  );
}
