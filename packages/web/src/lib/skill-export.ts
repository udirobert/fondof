/**
 * Format a skill markdown for different agent harnesses.
 * Each harness has slightly different conventions.
 */

export interface ExportTarget {
  id: string;
  label: string;
  path: string;
  description: string;
}

export const EXPORT_TARGETS: ExportTarget[] = [
  {
    id: "kiro",
    label: "Kiro steering",
    path: ".kiro/steering/",
    description: "Kiro reads .kiro/steering/*.md automatically",
  },
  {
    id: "cursor",
    label: "Cursor rules",
    path: ".cursor/rules/",
    description: "Cursor reads .cursor/rules/*.md for project context",
  },
  {
    id: "claude",
    label: "CLAUDE.md",
    path: "CLAUDE.md",
    description: "Claude Code reads CLAUDE.md from your repo root",
  },
  {
    id: "copilot",
    label: "Copilot instructions",
    path: ".github/copilot-instructions.md",
    description: "GitHub Copilot reads this for project context",
  },
  {
    id: "generic",
    label: "Markdown file",
    path: "skills/",
    description: "Generic markdown — works anywhere",
  },
];

/** Generate a filename from a skill title. */
function toFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) + ".md"
  );
}

/** Format skill for a specific harness. Returns { content, filename, path }. */
export function formatForHarness(
  markdown: string,
  title: string,
  targetId: string,
): { content: string; filename: string; fullPath: string } {
  const _target = EXPORT_TARGETS.find((t) => t.id === targetId) ?? EXPORT_TARGETS[4];
  const filename = toFilename(title);

  switch (targetId) {
    case "kiro": {
      // Kiro steering: add front-matter
      const frontMatter = `---\ninclusion: manual\n---\n\n`;
      return {
        content: frontMatter + markdown,
        filename,
        fullPath: `.kiro/steering/${filename}`,
      };
    }
    case "cursor": {
      // Cursor rules: plain markdown, no special formatting needed
      return {
        content: markdown,
        filename,
        fullPath: `.cursor/rules/${filename}`,
      };
    }
    case "claude": {
      // CLAUDE.md: wrap as a section for appending
      const section = `\n\n## ${title}\n\n${markdown.replace(/^#\s+.+\n/, "")}`;
      return {
        content: section,
        filename: "CLAUDE.md",
        fullPath: "CLAUDE.md",
      };
    }
    case "copilot": {
      // Copilot: append-style section
      const section = `\n\n## ${title}\n\n${markdown.replace(/^#\s+.+\n/, "")}`;
      return {
        content: section,
        filename: "copilot-instructions.md",
        fullPath: ".github/copilot-instructions.md",
      };
    }
    default: {
      return {
        content: markdown,
        filename,
        fullPath: `skills/${filename}`,
      };
    }
  }
}
