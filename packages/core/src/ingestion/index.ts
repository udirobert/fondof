import type { IdeaRecord } from "@fondof/shared";

export interface IngestOptions {
  /** URL of the content to ingest (podcast, blog, etc.) */
  url: string;
}

export interface IngestResult {
  /** Type of content detected */
  contentType: "audio" | "article" | "text";
  /** SHA-256 hash of the source content */
  sourceHash: string;
  /** Extracted ideas */
  ideas: IdeaRecord[];
  /** Raw transcript (if audio) or extracted text */
  rawText: string;
}

/**
 * Ingest content from a URL — transcribe if audio, extract text if article,
 * then extract discrete ideas/patterns/techniques.
 */
export async function ingest(_options: IngestOptions): Promise<IngestResult> {
  // TODO: Implement content resolution, transcription, and idea extraction
  throw new Error("Not yet implemented");
}
