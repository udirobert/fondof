/**
 * Split forge markdown into progressive-disclosure sections.
 */

export type SkillSectionKind =
  | "context"
  | "guidance"
  | "anti"
  | "references"
  | "depends"
  | "gap"
  | "other";

export interface SkillSection {
  id: string;
  title: string;
  body: string;
  kind: SkillSectionKind;
  /** One-line peek for collapsed row */
  excerpt: string;
}

function classify(title: string): SkillSectionKind {
  const t = title.toLowerCase();
  if (/depend/.test(t)) return "depends";
  if (/gap|delta/.test(t)) return "gap";
  if (/context|intent|fit notes|overview/.test(t)) return "context";
  if (/anti/.test(t)) return "anti";
  if (/guidance|pattern|code|steps/.test(t)) return "guidance";
  if (/reference|source/.test(t)) return "references";
  return "other";
}

function excerptFrom(body: string, max = 96): string {
  const flat = body
    .replace(/```[\s\S]*?```/g, " … ")
    .replace(/[#>*_`()]/g, " ")
    .replaceAll("[", " ")
    .replaceAll("]", " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!flat) return "Expand for details";
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function slug(title: string, i: number) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "section"}-${i}`;
}

/**
 * Parse `#` / `##` headings into sections. Leading title `#` becomes preamble
 * under a synthetic Context only if there is real text before the first `##` and
 * the first section is not already Context. HTML comments and trailing signatures
 * are ignored.
 */
export function parseSkillSections(markdown: string): SkillSection[] {
  // Strip top/embedded HTML comments (e.g. <!-- Forged with fondof ... -->)
  const cleaned = markdown
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!cleaned) return [];

  const lines = cleaned.split("\n");
  const sections: { title: string; bodyLines: string[] }[] = [];
  let current: { title: string; bodyLines: string[] } | null = null;
  let preamble: string[] = [];
  let sawH1 = false;

  for (const line of lines) {
    // Skip trailing horizontal rule and forged footer if present at the end
    if (line.trim().startsWith("*Forged with [fondof]")) {
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);

    if (h2) {
      const nextTitle = h2[1].trim();
      if (current) {
        sections.push(current);
      } else {
        const meaningfulPreamble = preamble.filter((l) => l.trim() && l.trim() !== "---");
        // Only push synthetic context if next section is not already Context and preamble has content
        if (meaningfulPreamble.length > 0 && nextTitle.toLowerCase() !== "context") {
          sections.push({ title: "Context", bodyLines: [...meaningfulPreamble] });
        }
        preamble = [];
      }
      current = { title: nextTitle, bodyLines: [] };
      continue;
    }

    if (h1 && !sawH1) {
      sawH1 = true;
      // Title line — skip; blurb lives in skill-meta preview
      continue;
    }

    if (h1 && sawH1 && !current) {
      const nextTitle = h1[1].trim();
      const meaningfulPreamble = preamble.filter((l) => l.trim() && l.trim() !== "---");
      if (meaningfulPreamble.length > 0 && nextTitle.toLowerCase() !== "context") {
        sections.push({ title: "Context", bodyLines: [...meaningfulPreamble] });
      }
      preamble = [];
      current = { title: nextTitle, bodyLines: [] };
      continue;
    }

    if (current) current.bodyLines.push(line);
    else preamble.push(line);
  }

  if (current) sections.push(current);
  else {
    const meaningfulPreamble = preamble.filter((l) => l.trim() && l.trim() !== "---");
    if (meaningfulPreamble.length > 0) {
      sections.push({ title: "Context", bodyLines: meaningfulPreamble });
    }
  }

  return sections
    .map((s, i) => {
      // Filter out trailing --- or footer notes from body
      const bodyLines = s.bodyLines.filter((l) => !l.trim().startsWith("*Forged with [fondof]"));
      const body = bodyLines.join("\n").trim().replace(/---\s*$/, "").trim();
      if (!body && sections.length > 1) return null;
      return {
        id: slug(s.title, i),
        title: s.title,
        body: body || "(empty)",
        kind: classify(s.title),
        excerpt: excerptFrom(body),
      } satisfies SkillSection;
    })
    .filter((s): s is SkillSection => s != null);
}
