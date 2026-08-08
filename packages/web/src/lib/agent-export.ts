import type { IdeaFromAPI } from "@/lib/api";

/** Markdown agents can paste into Cursor / Claude / skill files. */
export function formatShardsForAgent(opts: {
  ideas: IdeaFromAPI[];
  sourceTitle?: string;
  sourceUrl?: string;
  fondObject?: string;
}): string {
  const { ideas, sourceTitle, sourceUrl, fondObject } = opts;
  const name = (sourceTitle || fondObject || "fondof-shards")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  const lines = [
    "---",
    `name: ${name || "fondof-shards"}`,
    "description: Ideas extracted by fondof — forge into a fitted agent skill.",
    sourceUrl ? `source: ${sourceUrl}` : null,
    `extracted: ${ideas.length}`,
    "---",
    "",
    `# ${sourceTitle || "Ideas from fondof"}`,
    "",
    sourceUrl ? `Source: ${sourceUrl}` : null,
    fondObject ? `Object: fondof · ${fondObject}` : null,
    "",
    "Use these as forge material. Prefer combining Forge-worthy shards into one skill fitted to the repo.",
    "",
  ].filter((x) => x !== null) as string[];

  for (const idea of ideas) {
    lines.push(`## ${idea.title}`);
    lines.push("");
    lines.push(idea.description);
    lines.push("");
    const meta = [
      idea.patternType,
      ...(idea.domain ?? []).slice(0, 3),
    ].filter(Boolean);
    if (meta.length) lines.push(`_${meta.join(" · ")}_`);
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function formatSelectedPrompt(opts: {
  ideas: IdeaFromAPI[];
  repo?: string;
}): string {
  const titles = opts.ideas.map((i) => i.title).join(", ");
  return [
    `Forge an agent skill from these fondof shards${opts.repo ? ` for \`${opts.repo}\`` : ""}: ${titles}.`,
    "",
    ...opts.ideas.map(
      (i, n) =>
        `${n + 1}. **${i.title}** (${i.patternType}) — ${i.description}`,
    ),
    "",
    "Output a single markdown skill with Context, Guidance (code), Anti-patterns, and References.",
  ].join("\n");
}
