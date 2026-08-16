import { describe, expect, it } from "vitest";
import { skillFitCheck } from "@/lib/skill-fit-check";

const GOOD = `# Retry Budgets for Async Fetch

## Context

Fitted to \`udirobert/fondof\` (Hono, Workers, TypeScript). Respect existing retry helpers in lib/.

## Guidance

Cap aggregate retries per request tree with a shared budget.

\`\`\`ts
export async function withRetryBudget<T>(op: () => Promise<T>, budget: number) {
  // hoist budget across the call graph
}
\`\`\`

## Anti-patterns

- Retrying on 4xx
- Independent per-call timeouts that stack

## References

- https://example.com/retry-budgets
`;

describe("skillFitCheck (structural heuristics, honest not an agent eval)", () => {
  it("passes a well-formed forged skill for its repo", () => {
    const result = skillFitCheck({
      markdown: GOOD,
      repo: "udirobert/fondof",
      frameworks: ["Hono", "Workers"],
    });
    expect(result.score).toBeGreaterThanOrEqual(75);
    const byId = new Map(result.items.map((i) => [i.id, i.status]));
    expect(byId.get("structure")).toBe("pass");
    expect(byId.get("citations")).toBe("pass");
    expect(byId.get("repo")).toBe("pass");
  });

  it("flags a draft that ignores the repo stack", () => {
    const offRepo = GOOD.replace(
      "Fitted to `udirobert/fondof` (Hono, Workers, TypeScript). Respect existing retry helpers in lib/.",
      "Generic advice for any codebase, no stack mentioned at all.",
    );
    const result = skillFitCheck({
      markdown: offRepo,
      repo: "udirobert/fondof",
      frameworks: ["Hono"],
    });
    const repoItem = result.items.find((i) => i.id === "repo");
    expect(repoItem?.status).not.toBe("pass");
  });

  it("marks long drafts for section expansion", () => {
    const long = GOOD + "\n" + "filler text about retries. ".repeat(300);
    const result = skillFitCheck({ markdown: long, repo: "udirobert/fondof" });
    expect(result.longDraft).toBe(true);
    const lengthItem = result.items.find((i) => i.id === "length");
    expect(lengthItem?.status).toBe("soft");
  });

  it("reports char count", () => {
    const result = skillFitCheck({ markdown: "abc" });
    expect(result.charCount).toBe(3);
  });
});
