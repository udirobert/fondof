"use client";

import { Loader2, Swords } from "lucide-react";
import { Tip } from "@/components/tip";
import { formatSignal } from "@/lib/idea-insights";
import { IdentityLabel } from "@/components/identity-label";
import type { OnChainChallenge } from "@/lib/api";
import { CHALLENGE_STAKE } from "@/lib/monad-chain";

interface ChallengeQueueProps {
  challenges: OnChainChallenge[];
  resolvingId: number | null;
  onResolve: (id: number, challengerWon: boolean) => void;
  losses?: number;
}

/**
 * Community policing — stake in plain terms, outcomes as badges.
 */
export function ChallengeQueue({
  challenges,
  resolvingId,
  onResolve,
  losses = 0,
}: ChallengeQueueProps) {
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
            Lost {losses} challenge{losses === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {challenges.length === 0 ? (
        <p className="text-sm text-foreground-secondary">
          No open disputes. Anyone can stake{" "}
          <span className="font-medium text-ink">{CHALLENGE_STAKE} MON</span> to
          challenge quality — if they win, this skill’s score drops.
        </p>
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={resolvingId === ch.challengeId}
                      onClick={() => onResolve(ch.challengeId, true)}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-full border border-ink/12 bg-paper px-3 text-[11px] text-ink hover:border-ember/35 disabled:opacity-40"
                    >
                      {resolvingId === ch.challengeId ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : null}
                      Challenger wins · cut score
                    </button>
                    <button
                      type="button"
                      disabled={resolvingId === ch.challengeId}
                      onClick={() => onResolve(ch.challengeId, false)}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-full border border-ink/12 bg-paper px-3 text-[11px] text-ink hover:border-ember/35 disabled:opacity-40"
                    >
                      Skill stands · forger wins
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
