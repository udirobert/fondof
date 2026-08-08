import type { ConnectedRepo } from "@/lib/github-repo";

export type LandingHit = {
  path: string;
  why: string;
};

/**
 * Structural “where it lands” map — honest heuristics, not a live tree walk.
 */
export function whereItLands(opts: {
  repoName?: string;
  frameworks?: string[];
  languages?: string[];
  ideaText?: string;
}): LandingHit[] {
  const fw = new Set(
    (opts.frameworks ?? []).map((f) => f.toLowerCase()),
  );
  const langs = new Set(
    (opts.languages ?? []).map((l) => l.toLowerCase()),
  );
  const text = (opts.ideaText ?? "").toLowerCase();
  const hits: LandingHit[] = [];

  if (fw.has("next.js") || fw.has("react") || langs.has("typescript")) {
    hits.push({
      path: "app/ · components/",
      why: "UI and route surfaces that own the behavior",
    });
    if (/error|boundary|retry|timeout|fail/.test(text)) {
      hits.push({
        path: "error.tsx · route handlers",
        why: "Failure paths agents should harden first",
      });
    }
    if (/cache|prefetch|fetch|async/.test(text)) {
      hits.push({
        path: "lib/ · data loaders",
        why: "Fetch and cache seams for the pattern",
      });
    }
  }

  if (
    fw.has("hono") ||
    fw.has("workers") ||
    fw.has("express") ||
    fw.has("fastify")
  ) {
    hits.push({
      path: "routes/ · middleware",
      why: "Request chain where the skill should bind",
    });
  }

  if (
    fw.has("viem") ||
    fw.has("wagmi") ||
    fw.has("solidity") ||
    /chain|wallet|contract|monad/.test(text)
  ) {
    hits.push({
      path: "lib/chain · wallet client",
      why: "On-chain calls stay behind existing clients",
    });
  }

  if (fw.has("foundry") || langs.has("solidity")) {
    hits.push({
      path: "src/ · test/",
      why: "Contracts and Foundry tests for the change",
    });
  }

  if (!hits.length) {
    hits.push({
      path: "module that owns this concern",
      why: "Smallest place the pattern already belongs",
    });
    hits.push({
      path: "nearest test or smoke path",
      why: "Prove the change without a new abstraction",
    });
  }

  const repoShort = opts.repoName?.split("/").pop();
  if (repoShort && hits.length < 5) {
    hits.push({
      path: `${repoShort}/ conventions`,
      why: "Match existing style before inventing helpers",
    });
  }

  return hits.slice(0, 5);
}

export function landingHitsFromRepo(
  repo: Pick<ConnectedRepo, "fullName" | "frameworks" | "languages"> | null | undefined,
  ideaText?: string,
): LandingHit[] {
  if (!repo) {
    return whereItLands({ ideaText, repoName: "your-repo" });
  }
  return whereItLands({
    repoName: repo.fullName,
    frameworks: repo.frameworks,
    languages: repo.languages.map((l) => l.language),
    ideaText,
  });
}
