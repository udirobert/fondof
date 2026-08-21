import type { IdeaRecord, RepoProfile, SkillDraft, SkillSource } from "@fondof/shared";
import { createHash, randomUUID } from "node:crypto";
import type { LLMProvider } from "../ingestion/idea-extractor.js";
import {
  COMPOSE_SKILL_SYSTEM,
  COMPOSE_SKILL_USER,
} from "../prompts/compose-skill.prompt.js";
import { renderSkillMarkdown } from "./renderer.js";

export interface ComposeSkillOptions {
  /** Ideas to compose into a skill */
  ideas: IdeaRecord[];
  /** Target repository the skill is fitted to */
  targetRepo: RepoProfile;
  /** LLM provider */
  llm: LLMProvider;
}

interface LLMSkillResponse {
  title: string;
  domain: string[];
  applicability: string[];
  context: string;
  guidance: string;
  antiPatterns: string;
  references: string;
}

/**
 * Compose a skill from one or more ideas, fitted to the target repository.
 * Uses LLM to synthesize ideas into a coherent, environment-specific skill.
 */
export async function composeSkill(options: ComposeSkillOptions): Promise<SkillDraft> {
  const { ideas, targetRepo, llm } = options;

  // Build the ideas description for the prompt
  const ideasStr = ideas
    .map(
      (idea, i) =>
        `### Idea ${i + 1}: ${idea.idea.title}
Source: ${idea.sourceUrl}
Type: ${idea.idea.patternType}
Description: ${idea.idea.description}
Domain: ${idea.idea.domain.join(", ")}
Segment: ${idea.segment.rawText.slice(0, 500)}`
    )
    .join("\n\n");

  // Build repo context
  const repoContext = `Repository: ${targetRepo.fullName}
Languages: ${targetRepo.languages.map((l) => `${l.language} (${l.percentage}%)`).join(", ")}
Frameworks: ${targetRepo.frameworks.join(", ") || "none"}
Key dependencies: ${targetRepo.dependencies.slice(0, 15).map((d) => d.name).join(", ")}
Error handling: ${targetRepo.conventions.errorHandling}
Testing: ${targetRepo.conventions.testing}
Architecture: ${targetRepo.conventions.architecture}`;

  // Build existing skills context
  const existingSkills =
    targetRepo.existingSkills.length > 0
      ? targetRepo.existingSkills.join(", ")
      : "(none)";

  // Call LLM to compose
  const response = await llm.chat(
    COMPOSE_SKILL_SYSTEM,
    COMPOSE_SKILL_USER({ ideas: ideasStr, repoContext, existingSkills })
  );

  // Parse the LLM response into structured skill content
  const parsed = parseSkillResponse(response);

  // Build sources from ideas
  const sources: SkillSource[] = ideas.map((idea) => ({
    url: idea.sourceUrl,
    segment: sourceSegmentLabel(idea.segment),
    contribution: idea.idea.title,
  }));

  // Build the full markdown
  const skillContent = {
    context: parsed.context,
    guidance: parsed.guidance,
    antiPatterns: parsed.antiPatterns,
    references: parsed.references,
  };

  const sourceHashes = ideas.map((idea) => idea.sourceHash);
  const composedAt = new Date().toISOString();

  const markdown = renderSkillMarkdown({
    title: parsed.title,
    domain: parsed.domain,
    applicability: parsed.applicability,
    sources,
    provenance: { sourceHashes, composedAt, fittedTo: targetRepo.fullName },
    content: skillContent,
  });

  const _skillHash = createHash("sha256").update(markdown).digest("hex");

  return {
    id: randomUUID(),
    title: parsed.title,
    domain: parsed.domain,
    applicability: parsed.applicability,
    sources,
    provenance: {
      sourceHashes,
      composedAt,
      fittedTo: targetRepo.fullName,
    },
    content: skillContent,
    markdown,
  };
}

/**
 * Parse the LLM's skill composition response.
 * Handles both structured JSON and freeform markdown responses.
 */
function parseSkillResponse(response: string): LLMSkillResponse {
  // Try JSON first
  const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.title && data.guidance) {
        return {
          title: data.title,
          domain: data.domain ?? [],
          applicability: data.applicability ?? [],
          context: data.context ?? "",
          guidance: data.guidance ?? "",
          antiPatterns: data.antiPatterns ?? data.anti_patterns ?? "",
          references: data.references ?? "",
        };
      }
    } catch {
      // Fall through to markdown parsing
    }
  }

  // Parse as markdown with YAML frontmatter
  const titleMatch = response.match(/^#\s+(.+)$/m) ?? response.match(/title:\s*(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled Skill";

  const domainMatch = response.match(/domain:\s*\[([^\]]+)\]/) ?? response.match(/domain:\s*(.+)/);
  const domain = domainMatch
    ? domainMatch[1].split(",").map((s) => s.trim().replace(/['"]/g, ""))
    : [];

  const applicabilityMatch =
    response.match(/applicability:\s*\[([^\]]+)\]/) ??
    response.match(/applicability:\s*(.+)/);
  const applicability = applicabilityMatch
    ? applicabilityMatch[1].split(",").map((s) => s.trim().replace(/['"]/g, ""))
    : [];

  // Extract sections
  const context = extractSection(response, "Context") ?? "";
  const guidance = extractSection(response, "Guidance") ?? extractMainContent(response);
  const antiPatterns = extractSection(response, "Anti-patterns") ?? extractSection(response, "Anti-Patterns") ?? "";
  const references = extractSection(response, "References") ?? "";

  return { title, domain, applicability, context, guidance, antiPatterns, references };
}

/**
 * Extract a markdown section by heading name.
 */
function extractSection(text: string, heading: string): string | null {
  const regex = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract the main content body (everything after frontmatter and before sections).
 */
function extractMainContent(text: string): string {
  // Remove frontmatter
  const withoutFrontmatter = text.replace(/^---[\s\S]*?---\n?/, "");
  // Remove the first heading
  const withoutTitle = withoutFrontmatter.replace(/^#\s+.+\n?/, "");
  // Take everything up to the first ## heading
  const mainMatch = withoutTitle.match(/^([\s\S]*?)(?=\n##\s|$)/);
  return mainMatch ? mainMatch[1].trim() : withoutTitle.trim();
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Audio uses timestamps; text uses paragraphs. `startTime: 0` is a valid cue. */
export function sourceSegmentLabel(segment: {
  startTime?: number;
  endTime?: number;
  startParagraph?: number;
  endParagraph?: number;
}): string {
  if (segment.startTime !== undefined) {
    return `${formatTime(segment.startTime)}–${formatTime(segment.endTime ?? 0)}`;
  }
  return `Paragraphs ${segment.startParagraph ?? 0}–${segment.endParagraph ?? 0}`;
}
