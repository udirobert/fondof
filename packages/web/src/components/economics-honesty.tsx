"use client";

import { Tip } from "@/components/tip";
import { CHALLENGE_STAKE, FORGE_BACKING } from "@/lib/monad-chain";

interface EconomicsHonestyProps {
  /** Compact one-liner vs fuller explainer */
  variant?: "banner" | "details";
}

/**
 * Explicit: SkillPool is quality signaling, not a marketplace or yield product.
 */
export function EconomicsHonesty({ variant = "banner" }: EconomicsHonestyProps) {
  if (variant === "banner") {
    return (
      <p className="rounded-lg border border-ink/8 bg-mist/50 px-3 py-2 text-[11px] leading-snug text-foreground-secondary">
        Quality signaling — not a marketplace. Backing is skin in the game so
        skills can be scored; it isn’t a withdrawable deposit or earnings pool.
      </p>
    );
  }

  return (
    <div className="space-y-2 text-[11px] leading-snug text-muted">
      <p className="font-medium uppercase tracking-wider text-ink/70">
        How the money works
      </p>
      <ul className="list-disc space-y-1.5 pl-4">
        <li>
          <Tip tip="forge">
            <span className="cursor-help border-b border-dotted border-muted/40 text-ink">
              Forge
            </span>
          </Tip>
          : put ≥{FORGE_BACKING} MON as skin so the skill can be scored. Escrow
          stays in the contract — no withdraw (listing fee, not a vault).
        </li>
        <li>
          <Tip tip="challenge">
            <span className="cursor-help border-b border-dotted border-muted/40 text-ink">
              Challenge
            </span>
          </Tip>
          : stake ≥{CHALLENGE_STAKE} MON to dispute. Win → take up to your stake
          from the skill’s backing (~2× if it had enough). Lose → your stake
          funds the skill’s reputation (backing grows; you don’t pay the
          forger’s wallet).
        </li>
        <li>
          Resolve: demo oracle (relayer / deployer) — not decentralized
          adjudication yet. Economics rest on that key’s honesty.
        </li>
      </ul>
      <p>
        Designed as expensive policing for trust, not profit. Failed challenges
        make a skill harder to knock down; each lost challenge hurts the score
        harder than a single use lifts it.
      </p>
    </div>
  );
}
