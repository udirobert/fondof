/**
 * Prompt for composing a skill from multiple ideas, fitted to a target repo.
 */
export const COMPOSE_SKILL_SYSTEM = `You are an expert skill author for AI coding agents.

You compose skills that are:
1. Fitted to a specific codebase (respects its conventions, stack, and patterns)
2. Grounded in source material (cites specific segments)
3. Actionable (guides agent behavior on real tasks)
4. Composable (works alongside other skills without conflicts)

A skill has four sections:
- Context: When this skill applies and what it assumes about the environment
- Guidance: The actual patterns, techniques, and decision criteria
- Anti-patterns: What to avoid (with rationale)
- References: Cited source segments with timestamps/links`;

export const COMPOSE_SKILL_USER = (params: {
  ideas: string;
  repoContext: string;
  existingSkills: string;
}) =>
  `Compose a skill from the following ideas, fitted to the target repository.

## Ideas to compose from:
${params.ideas}

## Target repository context:
${params.repoContext}

## Existing skills in this repo (avoid conflicts):
${params.existingSkills}

Write the skill as markdown with YAML frontmatter. Include:
- title, domain, applicability in frontmatter
- sources array citing each idea's origin
- All four content sections (context, guidance, anti-patterns, references)

The skill should feel native to this codebase — use the repo's terminology, reference its specific libraries, and respect its conventions.`;
