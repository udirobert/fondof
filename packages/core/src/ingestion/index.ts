import { createHash } from "node:crypto";
import type { IdeaRecord } from "@fondof/shared";
import { resolveContent, type ContentType } from "./content-resolver.js";
import { transcribe } from "./transcriber.js";
import { extractArticle } from "./article-extractor.js";
import { extractIdeas, type LLMProvider } from "./idea-extractor.js";

export type { LLMProvider } from "./idea-extractor.js";
export type { ContentType } from "./content-resolver.js";

export interface IngestOptions {
  /** URL of the content to ingest (podcast, blog, etc.) */
  url: string;
  /** LLM provider for idea extraction */
  llm: LLMProvider;
  /** Optional language hint for transcription (ISO 639-3) */
  languageCode?: string;
  /** Optional domain-specific keyterms for transcription accuracy */
  keyterms?: string[];
}

export interface IngestResult {
  /** Type of content detected */
  contentType: ContentType;
  /** SHA-256 hash of the source content */
  sourceHash: string;
  /** Extracted ideas */
  ideas: IdeaRecord[];
  /** Raw transcript or extracted text */
  rawText: string;
  /** Title (if article) */
  title?: string;
  /** Author (if article) */
  author?: string;
}

/**
 * Ingest content from a URL — transcribe if audio, extract text if article,
 * then extract discrete ideas/patterns/techniques via LLM.
 */
export async function ingest(options: IngestOptions): Promise<IngestResult> {
  const { url, llm, languageCode, keyterms } = options;

  // Step 1: Resolve content type
  const resolved = await resolveContent(url);

  let rawText: string;
  let title: string | undefined;
  let author: string | undefined;

  // Step 2: Get text content based on type
  switch (resolved.type) {
    case "audio": {
      if (!resolved.audioUrl) {
        throw new Error(`Could not resolve audio URL from ${url}`);
      }
      const transcript = await transcribe({
        audioUrl: resolved.audioUrl,
        languageCode,
        keyterms,
      });
      rawText = transcript.fullText;
      break;
    }
    case "article": {
      const article = await extractArticle(url);
      rawText = article.textContent;
      title = article.title;
      author = article.author ?? undefined;
      break;
    }
    case "text": {
      const response = await fetch(url);
      rawText = await response.text();
      break;
    }
  }

  // Step 3: Hash the source content
  const sourceHash = createHash("sha256").update(rawText).digest("hex");

  // Step 4: Extract ideas via LLM
  const ideas = await extractIdeas({
    text: rawText,
    sourceUrl: url,
    sourceHash,
    llm,
  });

  return {
    contentType: resolved.type,
    sourceHash,
    ideas,
    rawText,
    title,
    author,
  };
}
