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
  if (/guidance|pattern|code|steps/.test(t)) return "guidance";
  if (/anti/.test(t)) return "anti";
  if (/reference|source/.test(t)) return "references";
  return "other";
}

function excerptFrom(body: string, max = 96): string {
  const flat = body
    .replace(/```[\s\S]*?```/g, " … ")
    .replace(/[#>*_`[\]()]/g, " ")
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
 * under a synthetic Context if there is body before the first `##`.
 */
export function parseSkillSections(markdown: string): SkillSection[] {
  const text = markdown.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const lines = text.split("\n");
  const sections: { title: string; bodyLines: string[] }[] = [];
  let current: { title: string; bodyLines: string[] } | null = null;
  let preamble: string[] = [];
  let sawH1 = false;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);

    if (h2) {
      if (current) sections.push(current);
      else if (preamble.some((l) => l.trim())) {
        sections.push({ title: "Context", bodyLines: [...preamble] });
        preamble = [];
      }
      current = { title: h2[1].trim(), bodyLines: [] };
      continue;
    }

    if (h1 && !sawH1) {
      sawH1 = true;
      // Title line — skip; blurb lives in skill-meta preview
      continue;
    }

    if (h1 && sawH1 && !current) {
      // Second top-level heading treated as section
      if (preamble.some((l) => l.trim())) {
        sections.push({ title: "Context", bodyLines: [...preamble] });
        preamble = [];
      }
      current = { title: h1[1].trim(), bodyLines: [] };
      continue;
    }

    if (current) current.bodyLines.push(line);
    else preamble.push(line);
  }

  if (current) sections.push(current);
  else if (preamble.some((l) => l.trim())) {
    sections.push({ title: "Context", bodyLines: preamble });
  }

  return sections
    .map((s, i) => {
      const body = s.bodyLines.join("\n").trim();
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
