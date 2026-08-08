"use client";

import { Tip } from "@/components/tip";

interface EconomicsHonestyProps {
  /** One surface line vs full matrix under On-chain details */
  variant?: "line" | "details";
}

/**
 * Explicit: SkillPool is quality signaling, not a marketplace or yield product.
 */
export function EconomicsHonesty({ variant = "line" }: EconomicsHonestyProps) {
  if (variant === "line") {
    return (
      <p className="text-[11px] leading-snug text-muted">
        Quality signaling — not a marketplace. Skin scores skills; it isn’t
        earnings.
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
          : put skin in escrow so the skill can be scored. No withdraw — listing
          fee, not a vault.
        </li>
        <li>
          <Tip tip="challenge">
            <span className="cursor-help border-b border-dotted border-muted/40 text-ink">
              Challenge
            </span>
          </Tip>
          : stake to dispute. Win → take skin from the skill (capped at your
          stake). Lose → your stake funds the skill’s reputation.
        </li>
        <li>
          Resolve: demo oracle (relayer) — not decentralized adjudication yet.
        </li>
      </ul>
      <p>
        Expensive policing for trust, not profit. Failed disputes make honest
        skills stronger.
      </p>
    </div>
  );
}
