import type { SkillSource, SkillProvenance } from "@fondof/shared";

export interface RenderOptions {
  title: string;
  domain: string[];
  applicability: string[];
  sources: SkillSource[];
  provenance: SkillProvenance;
  content: {
    context: string;
    guidance: string;
    antiPatterns: string;
    references: string;
  };
}

/**
 * Render a SkillDraft into the agent-agnostic markdown format with YAML frontmatter.
 * Works with Kiro steering files, SKILL.md, Claude projects, Cursor rules, etc.
 */
export function renderSkillMarkdown(options: RenderOptions): string {
  const { title, domain, applicability, sources, provenance, content } = options;

  const frontmatter = buildFrontmatter({
    title,
    domain,
    applicability,
    sources,
    provenance,
  });

  const sections: string[] = [
    frontmatter,
    `# ${title}`,
    "",
  ];

  if (content.context) {
    sections.push("## Context", "", content.context, "");
  }

  if (content.guidance) {
    sections.push("## Guidance", "", content.guidance, "");
  }

  if (content.antiPatterns) {
    sections.push("## Anti-patterns", "", content.antiPatterns, "");
  }

  if (content.references) {
    sections.push("## References", "", content.references, "");
  }

  return sections.join("\n");
}

function buildFrontmatter(data: {
  title: string;
  domain: string[];
  applicability: string[];
  sources: SkillSource[];
  provenance: SkillProvenance;
}): string {
  const lines: string[] = ["---"];

  lines.push(`title: "${data.title}"`);
  lines.push(`domain: [${data.domain.map((d) => `"${d}"`).join(", ")}]`);
  lines.push(`applicability: [${data.applicability.map((a) => `"${a}"`).join(", ")}]`);

  lines.push("sources:");
  for (const source of data.sources) {
    lines.push(`  - url: "${source.url}"`);
    lines.push(`    segment: "${source.segment}"`);
    lines.push(`    contribution: "${source.contribution}"`);
  }

  lines.push("provenance:");
  lines.push(`  sourceHashes:`);
  for (const hash of data.provenance.sourceHashes) {
    lines.push(`    - "${hash}"`);
  }
  lines.push(`  composedAt: "${data.provenance.composedAt}"`);
  lines.push(`  fittedTo: "${data.provenance.fittedTo}"`);

  lines.push("---");
  lines.push("");

  return lines.join("\n");
}
