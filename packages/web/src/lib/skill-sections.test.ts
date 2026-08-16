import { describe, expect, it } from "vitest";
import { parseSkillSections } from "@/lib/skill-sections";

const FORGED = `# Retry Budgets for Async Fetch

## Context

Fitted to \`udirobert/fondof\` from 2 source ideas.

## Guidance

Cap aggregate retries per request tree.

\`\`\`ts
await withRetryBudget(op, 3);
\`\`\`

## Anti-patterns

- Retrying on 4xx responses
- Unbounded backoff without jitter

## References

- [Retry budgets](https://example.com/retries)
`;

describe("parseSkillSections (forge markdown → progressive disclosure)", () => {
  it("splits the canonical forge output into its sections", () => {
    const sections = parseSkillSections(FORGED);
    const titles = sections.map((s) => s.title);
    expect(titles).toContain("Context");
    expect(titles).toContain("Guidance");
    expect(titles).toContain("Anti-patterns");
    expect(titles).toContain("References");
  });

  it("classifies section kinds", () => {
    const sections = parseSkillSections(FORGED);
    const kinds = new Map(sections.map((s) => [s.title.toLowerCase(), s.kind]));
    expect(kinds.get("context")).toBe("context");
    expect(kinds.get("guidance")).toBe("guidance");
    expect(kinds.get("anti-patterns")).toBe("anti");
    expect(kinds.get("references")).toBe("references");
  });

  it("classifies delta-skill sections (Depends on / Gap to fill)", () => {
    const delta = `# Gap: Retry Budgets

## Depends on

- [Retry budgets](https://example.com/retries)

## Gap to fill

- Jittered backoff on the fetch wrapper

## Guidance

Wire jitter into \`fetchWithRetry\`.
`;
    const kinds = new Map(
      parseSkillSections(delta).map((s) => [s.title.toLowerCase(), s.kind]),
    );
    expect(kinds.get("depends on")).toBe("depends");
    expect(kinds.get("gap to fill")).toBe("gap");
  });

  it("returns [] for empty markdown", () => {
    expect(parseSkillSections("")).toEqual([]);
  });
});
