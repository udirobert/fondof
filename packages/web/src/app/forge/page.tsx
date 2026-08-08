export default function ForgePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Forge a Skill</h1>
      <p className="text-muted mb-12">
        Select ideas from your canvas, choose a target repo, and compose a
        skill fitted to your environment.
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Selected Ideas */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">
            Selected Ideas
          </h2>
          <div className="rounded-xl border border-border bg-surface p-6 min-h-64">
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-4xl mb-4 opacity-30">&#9881;</div>
              <p className="text-sm text-muted">
                No ideas selected yet. Go to the{" "}
                <a href="/canvas" className="text-accent hover:underline">
                  Canvas
                </a>{" "}
                and select ideas to forge.
              </p>
            </div>
          </div>

          {/* Skill preview area */}
          <h2 className="text-xs font-mono text-muted uppercase tracking-wider mt-8 mb-4">
            Skill Preview
          </h2>
          <div className="rounded-xl border border-dashed border-border bg-background p-6 min-h-48">
            <p className="text-sm text-muted text-center">
              The forged skill will appear here for review before saving.
            </p>
          </div>
        </div>

        {/* Right: Target Repo + Controls */}
        <div>
          <h2 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">
            Target Repository
          </h2>
          <div className="rounded-xl border border-border bg-surface p-4 mb-6">
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              defaultValue=""
            >
              <option value="" disabled>
                Select a repo...
              </option>
              <option value="udirobert/api-gateway">udirobert/api-gateway</option>
              <option value="udirobert/fondof">udirobert/fondof</option>
            </select>
            <p className="text-[10px] text-muted mt-2">
              The skill will be fitted to this repo&apos;s stack and conventions.
            </p>
          </div>

          <h2 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">
            Actions
          </h2>
          <div className="space-y-3">
            <button
              disabled
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-dim transition-colors"
            >
              Forge Skill
            </button>
            <button
              disabled
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface transition-colors"
            >
              Publish with Attestation
            </button>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] text-muted">
              <strong className="text-foreground">Provenance:</strong> When published,
              the skill&apos;s lineage (sources → ideas → skill) is attested on Monad.
              Completely invisible — no wallet needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
