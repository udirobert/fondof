import type { ExistingSkillHit, IdeaFromAPI } from "@/lib/api";
import { cosineSimilarity } from "@/lib/embedding";

export type SkillOverlap = {
  skill: ExistingSkillHit;
  score: number;
  label: "covers" | "partial";
  why: string;
  /** How the label was decided */
  method: "embedding" | "lexical";
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

/**
 * Score coverage of an idea by an existing skill.
 * Prefers server embedding cosine (from Compare) when present; else lexical Jaccard-ish.
 */
export function scoreSkillOverlap(
  idea: IdeaFromAPI,
  skill: ExistingSkillHit,
  ideaIndex?: number,
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
  const lexical = shared / Math.min(ideaTok.size, 12);

  // Prefer per-idea embedding from Compare; fall back to best-of-batch score
  const perIdea =
    typeof ideaIndex === "number"
      ? skill.ideaScores?.find((s) => s.ideaIndex === ideaIndex)?.score
      : undefined;
  const embed =
    typeof perIdea === "number" && perIdea > 0
      ? perIdea
      : typeof skill.score === "number" && skill.score > 0
        ? skill.score
        : 0;

  // Title must share at least one token with the skill, OR embed must be strong —
  // avoids ranking a high global Exa hit as "covers" for an unrelated shard.
  const titleTok = tokens(idea.title);
  let titleHit = false;
  for (const t of titleTok) {
    if (skillTok.has(t)) {
      titleHit = true;
      break;
    }
  }

  if (embed >= 0.28 && (titleHit || embed >= 0.5 || shared >= 2)) {
    const label: SkillOverlap["label"] = embed >= 0.52 ? "covers" : "partial";
    const pct = Math.round(embed * 100);
    return {
      skill,
      score: embed,
      label,
      method: "embedding",
      why:
        label === "covers"
          ? `Embedding ${pct}% — existing skill likely covers this`
          : `Embedding ${pct}% — partial; forge only the gap`,
    };
  }

  if (lexical < 0.14 && shared < 2) return null;

  const label: SkillOverlap["label"] =
    lexical >= 0.38 || shared >= 4 ? "covers" : "partial";
  return {
    skill,
    score: lexical,
    label,
    method: "lexical",
    why:
      sharedWords.length > 0
        ? `Shared terms: ${sharedWords.join(", ")}`
        : label === "covers"
          ? "Lexical match suggests coverage"
          : "Partial lexical overlap — forge the gap",
  };
}

export function overlapsForIdea(
  idea: IdeaFromAPI,
  skills: ExistingSkillHit[],
  ideaIndex?: number,
): SkillOverlap[] {
  return skills
    .map((s) => scoreSkillOverlap(idea, s, ideaIndex))
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
  ideas.forEach((idea, idx) => {
    const top = overlapsForIdea(idea, skills, idx)[0];
    if (!top) return;
    if (top.label === "covers") covered += 1;
    else partial += 1;
  });
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
