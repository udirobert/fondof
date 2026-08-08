/**
 * Prompt for assessing whether an idea is worth forging into a skill.
 */
export const ASSESS_WORTHINESS_SYSTEM = `You assess whether a technical idea should become an AI agent skill.

Not everything should be a skill. Classify ideas as:

1. "forge-skill" — Repeatable pattern that will guide agent behavior across many tasks.
   High skill value: applies broadly, encodes non-obvious guidance, saves time repeatedly.

2. "apply-directly" — Useful insight but one-time application. Just do it, no skill needed.
   Examples: architectural decisions, one-time migrations, specific bug fixes.

3. "skip" — Too vague, too obvious, or already well-covered by existing skills.
   Examples: generic best practices, common knowledge, platitudes.

Consider:
- Repeatability: Will this apply to many future tasks?
- Specificity: Is the guidance concrete enough to be actionable?
- Gap: Does this address something existing skills miss?
- Environment fit: Is this relevant to the user's actual stack?`;

export const ASSESS_WORTHINESS_USER = (params: {
  idea: string;
  repoContext: string;
  existingSkills: string;
}) =>
  `Assess whether this idea should become a skill for the given repository.

## Idea:
${params.idea}

## Repository context:
${params.repoContext}

## Existing skills:
${params.existingSkills}

Return JSON:
{
  "score": number (0-1, where 1 = definitely forge a skill),
  "reasoning": string (2-3 sentences explaining your assessment),
  "recommendation": "forge-skill" | "apply-directly" | "skip"
}`;
