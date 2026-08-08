/** Short plain-language tips for fondof jargon. */
export const GLOSSARY = {
  forge:
    "Compose ideas into a skill, then put ≥0.001 MON as skin so it can be scored — escrow stays in the contract (no withdraw).",
  apply:
    "This idea already exists as a skill pattern — copy an apply pack instead of reforging.",
  skip: "One-off or anti-pattern — useful to note, but leave it out of the forge tray.",
  shard:
    "A discrete idea pulled from the source — select a few to forge into one skill.",
  compare:
    "Search existing skills (Exa) so you don’t reforge something that already exists.",
  fit: "Which shards match your repo’s languages and stack — show or select them to forge.",
  signal:
    "Proven quality score — rises with agent uses, falls hard when challenges succeed. Not a price or yield.",
  acquire:
    "Draw the next skill for your agent — weighted by proven quality, not search ranking.",
  exists: "A similar skill already covers this — prefer apply over reforging.",
  partial:
    "Something similar exists — forge the gap to capture what’s still missing.",
  skillpool:
    "On-chain quality registry — forge, use, challenge, draw. Signaling, not a marketplace.",
  challenge:
    "Stake ≥0.001 MON to dispute quality. Win → take skin from the skill (capped at your stake). Lose → your stake funds the skill’s reputation.",
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;

/** One-line stories when signal moves. */
export function signalChangeStory(opts: {
  prevUses: number;
  nextUses: number;
  prevLosses: number;
  nextLosses: number;
  prevSignal: string;
  nextSignal: string;
}): string | null {
  const useDelta = opts.nextUses - opts.prevUses;
  const lossDelta = opts.nextLosses - opts.prevLosses;
  if (useDelta > 0) {
    return useDelta === 1
      ? "Quality up — an agent just used this skill."
      : `Quality up — agents used this ${useDelta}× since last look.`;
  }
  if (lossDelta > 0) {
    return "Quality down — a challenge against this skill succeeded.";
  }
  if (opts.prevSignal !== opts.nextSignal && opts.nextUses === opts.prevUses) {
    return "Signal refreshed from the chain.";
  }
  return null;
}
