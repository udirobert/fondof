import type { IdeaFromAPI } from "@/lib/api";
import type { ConnectedRepo } from "@/lib/github-repo";

/** Deep apply flow — one-shot checklist + agent prompt fitted to the repo. */
export function buildApplyPack(
  idea: IdeaFromAPI,
  repo?: ConnectedRepo | null,
): string {
  const stack = repo
    ? [
        ...repo.frameworks.slice(0, 3),
        ...repo.languages.slice(0, 2).map((l) => l.language),
      ].join(", ")
    : "the current codebase";
  const repoName = repo?.fullName ?? "your-repo";
  const where =
    idea.applicability?.length
      ? idea.applicability.slice(0, 4).join(", ")
      : idea.domain?.slice(0, 3).join(", ") || "the relevant module";

  const touchHints = touchPoints(repo, idea);

  return `# Apply once — ${idea.title}

Not forging a skill. Apply this pattern once in \`${repoName}\` (${stack}).

## Pattern
${idea.description}

## Where to look
${where}

## Touch points
${touchHints.map((h) => `- ${h}`).join("\n")}

## Done when
- [ ] Behavior matches the pattern in one real path
- [ ] No new global abstraction unless the repo already has one
- [ ] Leave a one-line comment citing the source idea

## Agent prompt
Apply this once in ${repoName}. Do not create a reusable skill or package.
Stack: ${stack}.
Idea: ${idea.title} — ${idea.description}
Prefer the smallest change that lands the pattern. Show the diff.
`;
}

function touchPoints(repo: ConnectedRepo | null | undefined, idea: IdeaFromAPI): string[] {
  const fw = new Set((repo?.frameworks ?? []).map((f) => f.toLowerCase()));
  const text = `${idea.title} ${idea.description}`.toLowerCase();
  const hints: string[] = [];

  if (fw.has("next.js") || fw.has("react")) {
    hints.push("app/ or components/ near the feature that needs this");
    if (/error|boundary|retry/.test(text)) hints.push("error.tsx / route error handling");
  }
  if (fw.has("hono") || fw.has("workers") || fw.has("express") || fw.has("fastify")) {
    hints.push("route handler / middleware chain");
  }
  if (fw.has("viem") || fw.has("solidity") || /chain|wallet|contract/.test(text)) {
    hints.push("lib/chain or wallet client setup");
  }
  if (!hints.length) {
    hints.push("the module that already owns this concern");
    hints.push("nearest test or smoke path to prove it");
  }
  return hints.slice(0, 4);
}
