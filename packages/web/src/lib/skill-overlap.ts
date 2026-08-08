import type { ExistingSkillHit, IdeaFromAPI } from "@/lib/api";
import { cosineSimilarity } from "@/lib/embedding";

export type SkillOverlap = {
  skill: ExistingSkillHit;
  score: number;
  label: "covers" | "partial";
  why: string;
};

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "with",
  "your",
  "from",
  "into",
  "that",
  "this",
  "skill",
  "skills",
  "agent",
  "ai",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9.\s-]/g, " ")
      .split(/[\s./_-]+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

/** Score how much an existing skill already covers an idea. */
export function scoreSkillOverlap(
  idea: IdeaFromAPI,
  skill: ExistingSkillHit,
): SkillOverlap | null {
  const ideaTok = tokens(
    `${idea.title} ${idea.description} ${(idea.domain ?? []).join(" ")} ${(idea.applicability ?? []).join(" ")}`,
  );
  const skillTok = tokens(`${skill.title} ${skill.snippet ?? ""}`);
  if (ideaTok.size === 0 || skillTok.size === 0) return null;

  let shared = 0;
  const sharedWords: string[] = [];
  for (const t of ideaTok) {
    if (skillTok.has(t)) {
      shared += 1;
      if (sharedWords.length < 3) sharedWords.push(t);
    }
  }
  let score = shared / Math.min(ideaTok.size, 12);

  // Exa / server may attach an embedding-derived score (0–1)
  if (typeof skill.score === "number" && skill.score > 0) {
    score = Math.max(score, skill.score * 0.85);
  }

  if (score < 0.12 && shared < 2) return null;

  const label: SkillOverlap["label"] =
    score >= 0.35 || shared >= 4 ? "covers" : "partial";
  return {
    skill,
    score,
    label,
    why:
      sharedWords.length > 0
        ? `Overlaps on ${sharedWords.join(", ")}`
        : label === "covers"
          ? "Likely already covers this pattern"
          : "Partial overlap — forge the gap",
  };
}

export function overlapsForIdea(
  idea: IdeaFromAPI,
  skills: ExistingSkillHit[],
): SkillOverlap[] {
  return skills
    .map((s) => scoreSkillOverlap(idea, s))
    .filter((x): x is SkillOverlap => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

export function bestOverlapSummary(
  ideas: IdeaFromAPI[],
  skills: ExistingSkillHit[],
): { covered: number; partial: number } {
  let covered = 0;
  let partial = 0;
  for (const idea of ideas) {
    const top = overlapsForIdea(idea, skills)[0];
    if (!top) continue;
    if (top.label === "covers") covered += 1;
    else partial += 1;
  }
  return { covered, partial };
}

/** Pairwise related shards via compact embeddings (compose hint). */
export function relatedShardIds(
  ideas: IdeaFromAPI[],
  threshold = 0.72,
): string[] {
  const withEmbed = ideas.filter((i) => i.embedding?.length);
  if (withEmbed.length < 2) return [];
  let bestA = withEmbed[0]!;
  let bestB = withEmbed[1]!;
  let best = -1;
  for (let i = 0; i < withEmbed.length; i++) {
    for (let j = i + 1; j < withEmbed.length; j++) {
      const s = cosineSimilarity(
        withEmbed[i]!.embedding,
        withEmbed[j]!.embedding,
      );
      if (s > best) {
        best = s;
        bestA = withEmbed[i]!;
        bestB = withEmbed[j]!;
      }
    }
  }
  if (best < threshold) return [];
  return [bestA.id, bestB.id];
}
