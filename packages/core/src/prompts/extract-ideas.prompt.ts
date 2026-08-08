/**
 * Prompt for extracting discrete ideas/patterns/techniques from transcribed content.
 */
export const EXTRACT_IDEAS_SYSTEM = `You are an expert at identifying actionable technical ideas, patterns, and mental models from content.

Given a transcript or article text, extract discrete ideas that could be turned into agent skills.

For each idea, provide:
- title: A concise name for the pattern/technique
- description: A one-paragraph explanation
- domain: Topic tags (e.g. "error-handling", "testing", "architecture")
- applicability: Where it applies (e.g. "async", "distributed-systems", "react")
- patternType: One of "technique", "mental-model", "anti-pattern", "architecture"

Focus on ideas that are:
1. Actionable (can guide an agent's behavior)
2. Repeatable (applies to many situations, not just one)
3. Specific enough to be useful (not platitudes)

Skip ideas that are:
- Too vague or generic ("write clean code")
- One-time decisions ("use PostgreSQL for this project")
- Opinions without actionable guidance`;

export const EXTRACT_IDEAS_USER = (text: string) =>
  `Extract all actionable technical ideas from the following content. Return them as a JSON array.

Content:
---
${text}
---

Return valid JSON matching this schema:
[{
  "title": string,
  "description": string,
  "domain": string[],
  "applicability": string[],
  "patternType": "technique" | "mental-model" | "anti-pattern" | "architecture"
}]`;
