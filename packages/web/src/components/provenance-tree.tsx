"use client";

import { CheckCircle2 } from "lucide-react";
import { Tip } from "@/components/tip";

interface ProvenanceTreeProps {
  sourceHashes: string[];
  verifiedHref?: string;
  verifiedLabel?: string;
}

/**
 * Ingredient list — readable provenance, tech hash as secondary.
 */
export function ProvenanceTree({
  sourceHashes,
  verifiedHref,
  verifiedLabel = "Verified on Monad",
}: ProvenanceTreeProps) {
  if (sourceHashes.length === 0 && !verifiedHref) return null;

  return (
    <section aria-label="Provenance">
      <p className="text-[11px] uppercase tracking-wider text-muted">
        Where this skill came from
      </p>
      {sourceHashes.length > 0 ? (
        <ul className="mt-3 space-y-0 border-l border-ink/15 pl-3">
          {sourceHashes.map((h, i) => (
            <li key={h} className="relative pb-3 last:pb-0">
              <span
                className="absolute -left-[3.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-ember"
                aria-hidden
              />
              <p className="text-sm text-ink">
                Source material {sourceHashes.length > 1 ? i + 1 : ""}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted">
                Attested · sha256 {shortHash(h)}
              </p>
            </li>
          ))}
          <li className="relative">
            <span
              className="absolute -left-[3.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-ink/30"
              aria-hidden
            />
            <p className="text-sm text-ink">Forged skill on SkillPool</p>
            <p className="mt-0.5 text-[11px] text-muted">
              Ideas composed → quality score live on Monad
            </p>
          </li>
        </ul>
      ) : (
        <p className="mt-2 text-sm text-foreground-secondary">
          Published on SkillPool — source attestations attach at forge time.
        </p>
      )}
      {verifiedHref && (
        <a
          href={verifiedHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ember/30 bg-ember/8 px-2.5 py-1 text-[11px] font-medium text-ember hover:bg-ember/14"
        >
          <CheckCircle2 size={12} />
          <Tip tip="Anchored on Monad — open the explorer to verify.">
            <span>{verifiedLabel}</span>
          </Tip>
        </a>
      )}
    </section>
  );
}

function shortHash(h: string) {
  const clean = h.startsWith("0x") ? h.slice(2) : h;
  if (clean.length < 12) return clean;
  return `${clean.slice(0, 8)}…${clean.slice(-4)}`;
}
