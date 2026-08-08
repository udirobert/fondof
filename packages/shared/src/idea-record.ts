export interface SourceSegment {
  /** Start time in seconds (for audio sources) */
  startTime?: number;
  /** End time in seconds (for audio sources) */
  endTime?: number;
  /** Start paragraph index (for text sources) */
  startParagraph?: number;
  /** End paragraph index (for text sources) */
  endParagraph?: number;
  /** The raw text excerpt from the source */
  rawText: string;
}

export type PatternType =
  | "technique"
  | "mental-model"
  | "anti-pattern"
  | "architecture";

export interface ExtractedIdea {
  /** Short title for the idea */
  title: string;
  /** One-paragraph description of the idea */
  description: string;
  /** Domain tags (e.g. ["error-handling", "resilience"]) */
  domain: string[];
  /** Applicability tags (e.g. ["async", "distributed-systems"]) */
  applicability: string[];
  /** What kind of pattern this represents */
  patternType: PatternType;
}

export interface IdeaRecord {
  /** Unique identifier */
  id: string;
  /** URL of the original source */
  sourceUrl: string;
  /** SHA-256 hash of the source content */
  sourceHash: string;
  /** The segment of the source this idea was extracted from */
  segment: SourceSegment;
  /** The extracted idea */
  idea: ExtractedIdea;
  /** Vector embedding for semantic matching */
  embedding: number[];
  /** ISO timestamp of when this was extracted */
  extractedAt: string;
}
