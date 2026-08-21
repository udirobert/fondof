"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Swords } from "lucide-react";
import { Tip } from "@/components/tip";
import { formatSignal } from "@/lib/idea-insights";
import { IdentityLabel } from "@/components/identity-label";
import type { OnChainChallenge } from "@/lib/api";
import { CHALLENGE_STAKE } from "@/lib/monad-chain";

interface ChallengeQueueProps {
  challenges: OnChainChallenge[];
  resolvingId: number | null;
  onResolve: (id: number, challengerWon: boolean) => void;
  canResolve?: boolean;
  losses?: number;
}

/**
 * Community policing — stake in plain terms, honest payouts.
 * Resolve is a demo oracle, not something every visitor can do.
 */
export function ChallengeQueue({
  challenges,
  resolvingId,
  onResolve,
  canResolve = false,
  losses = 0,
}: ChallengeQueueProps) {
  const [showOracle, setShowOracle] = useState(false);

  return (
    <section className="space-y-3" aria-label="Challenges">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tip tip="challenge">
          <p className="cursor-help text-[11px] uppercase tracking-wider text-muted">
            Community challenges
          </p>
        </Tip>
        {losses > 0 && (
          <span className="rounded-full border border-ink/12 bg-mist px-2 py-0.5 text-[10px] text-ink">
            Lost {losses} challenge{losses === 1 ? "" : "s"} · score hit hard
          </span>
        )}
      </div>

      {challenges.length === 0 ? (
        <div className="space-y-2 text-sm text-foreground-secondary">
          <p>
            No open disputes. Stake{" "}
            <span className="font-medium text-ink">{CHALLENGE_STAKE} MON</span>{" "}
            to dispute quality — expensive policing, not a profit center.
          </p>
          <p className="text-[11px] leading-snug text-muted">
            Win → take up to your stake from this skill’s backing (~2× if it
            had enough). Lose → your stake funds the skill’s reputation
            (backing grows; the forger’s wallet doesn’t get paid).
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {challenges.map((ch) => (
            <li
              key={ch.challengeId}
              className="rounded-xl border border-ember/25 bg-ember/5 p-3"
            >
              <div className="flex items-start gap-2">
                <Swords size={14} className="mt-0.5 shrink-0 text-ember" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    Someone staked{" "}
                    <span className="font-medium">
                      {ch.stake
                        ? `${formatSignal(ch.stake)} MON`
                        : `${CHALLENGE_STAKE} MON`}
                    </span>{" "}
                    to dispute this skill
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                    <span>Challenge #{ch.challengeId}</span>
                    {ch.challenger ? (
                      <span className="inline-flex items-center gap-1">
                        by <IdentityLabel address={ch.challenger} />
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-2 text-[11px] leading-snug text-muted">
                    Waiting on the demo oracle to settle — visitors can’t
                    adjudicate; only the fondof relayer can resolve in this
                    build.
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canResolve && challenges.length > 0 && (
        <div className="rounded-xl border border-ink/8 bg-mist/40 px-3 py-2">
          <button
            type="button"
            onClick={() => setShowOracle((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left text-[11px] text-muted hover:text-ink"
            aria-expanded={showOracle}
          >
            <span>Demo oracle controls (relayer)</span>
            <ChevronDown
              size={13}
              className={`shrink-0 transition-transform ${showOracle ? "rotate-180" : ""}`}
            />
          </button>
          {showOracle && (
            <div className="mt-3 space-y-3 border-t border-ink/8 pt-3">
              <p className="text-[10px] leading-snug text-muted">
                Not decentralized adjudication — for demo settlement only.
                Reward is capped at the challenger’s stake.
              </p>
              {challenges.map((ch) => (
                <div key={`oracle-${ch.challengeId}`} className="space-y-2">
                  <p className="text-[11px] text-ink">
                    Challenge #{ch.challengeId}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={resolvingId === ch.challengeId}
                      onClick={() => onResolve(ch.challengeId, true)}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-full border border-ink/12 bg-paper px-3 text-[11px] text-ink hover:border-ember/35 disabled:opacity-40"
                    >
                      {resolvingId === ch.challengeId ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : null}
                      Challenger wins
                    </button>
                    <button
                      type="button"
                      disabled={resolvingId === ch.challengeId}
                      onClick={() => onResolve(ch.challengeId, false)}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-full border border-ink/12 bg-paper px-3 text-[11px] text-ink hover:border-ember/35 disabled:opacity-40"
                    >
                      Skill stands
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {challenges.length === 0 && (
        <p className="text-[10px] leading-snug text-muted">
          Resolve is a demo oracle (relayer) — not decentralized adjudication.
          Reward is capped at the challenger’s stake so griefing stays bounded.
        </p>
      )}
    </section>
  );
}
