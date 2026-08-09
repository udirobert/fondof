"use client";

/**
 * Lightweight footer strip showing agent compatibility and deploy targets.
 * Progressive disclosure: general dev audience sees familiar tool names,
 * no crypto jargon above the fold.
 */
export function WorksWithStrip({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`border-t border-ink/6 py-6 text-center ${className}`}
      aria-label="Compatibility"
    >
      <p className="text-[11px] uppercase tracking-wider text-muted">
        Skills work with
      </p>
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink">
        <span className="font-medium">Kiro</span>
        <span className="text-muted/40" aria-hidden>
          /
        </span>
        <span className="font-medium">Claude</span>
        <span className="text-muted/40" aria-hidden>
          /
        </span>
        <span className="font-medium">Cursor</span>
        <span className="text-muted/40" aria-hidden>
          /
        </span>
        <span className="text-foreground-secondary">any agent that reads markdown</span>
      </div>
      <p className="mt-4 text-[10px] text-muted">
        Deployed on Netlify · Powered by Cloudflare Workers
      </p>
    </footer>
  );
}
