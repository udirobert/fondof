"use client";

import { Tip } from "@/components/tip";
import { CHALLENGE_STAKE, FORGE_BACKING } from "@/lib/monad-chain";

interface SkillPoolLoopProps {
  /** Before publish vs after live */
  stage: "compose" | "live";
}

/**
 * What SkillPool does after forge — so publish isn’t a dead end.
 */
export function SkillPoolLoop({ stage }: SkillPoolLoopProps) {
  if (stage === "compose") {
    return (
      <div className="rounded-xl border border-ember/20 bg-ember/5 p-3.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ember">
          After you publish
        </p>
        <p className="mt-1.5 text-sm leading-snug text-ink">
          You put{" "}
          <Tip tip="forge">
            <span className="cursor-help border-b border-dotted border-ember/40 font-medium">
              {FORGE_BACKING} MON skin
            </span>
          </Tip>{" "}
          in escrow so this skill can be scored. Agents use it → score rises.
          Anyone can dispute with {CHALLENGE_STAKE} MON.
        </p>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-foreground-secondary">
          <li>
            <span className="font-medium text-ink">Dispute upheld</span> —
            challenger takes skin from the skill (capped ~2×); credibility drops.
          </li>
          <li>
            <span className="font-medium text-ink">Dispute fails</span> — their
            stake funds this skill’s reputation. Bogus attacks make honest skills
            stronger.
          </li>
        </ul>
        <p className="mt-2 text-[11px] leading-snug text-muted">
          Self-cleaning pool: real use builds signal, dead weight gets called
          out, fakes only harden the good ones. Not a marketplace.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-paper/80 p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
        The loop is live
      </p>
      <p className="mt-1.5 text-sm leading-snug text-ink">
        Share so agents can use it. Disputes are expensive policing — failed
        ones{" "}
        <span className="font-medium text-ember">make good skills stronger</span>
        .
      </p>
      <p className="mt-2 text-[11px] leading-snug text-muted">
        Open the public page to record uses, stake a dispute, or draw the next
        skill by proven score.
      </p>
    </div>
  );
}
