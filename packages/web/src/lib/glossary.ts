/** Short plain-language tips for fondof jargon. */
export const GLOSSARY = {
  forge:
    "Compose selected ideas into one skill markdown fitted to your repo — then you can publish it.",
  apply:
    "This idea already exists as a skill pattern — copy an apply pack instead of reforging.",
  skip: "One-off or anti-pattern — useful to note, but leave it out of the forge tray.",
  shard:
    "A discrete idea pulled from the source — select a few to forge into one skill.",
  compare:
    "Search existing skills (Exa) so you don’t reforge something that already exists.",
  fit: "Which shards match your repo’s languages and stack — show or select them to forge.",
  signal:
    "How well this skill holds up — rises when agents use it, falls when challenges succeed.",
  acquire:
    "Draw the next skill for your agent — weighted by proven quality, not search ranking.",
  exists: "A similar skill already covers this — prefer apply over reforging.",
  partial:
    "Something similar exists — forge the gap to capture what’s still missing.",
  skillpool:
    "Live registry of forged skills on Monad — forge, use, challenge, and draw by quality.",
  challenge:
    "Stake a small amount to dispute skill quality — community policing that can cut signal.",
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
