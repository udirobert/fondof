import { randomUUID } from "node:crypto";
import type { IdeaRecord, SourceSegment } from "@fondof/shared";
import { extractedIdeasResponseSchema, type ExtractedIdeaLLM } from "./schemas.js";
import {
  EXTRACT_IDEAS_SYSTEM,
  EXTRACT_IDEAS_USER,
} from "../prompts/extract-ideas.prompt.js";

export interface LLMProvider {
  /** Call the LLM with a system prompt and user message, return the text response */
  chat(system: string, user: string): Promise<string>;
}

export interface ExtractIdeasOptions {
  /** The text content to extract ideas from */
  text: string;
  /** The source URL */
  sourceUrl: string;
  /** The source content hash */
  sourceHash: string;
  /** LLM provider to use for extraction */
  llm: LLMProvider;
  /** Optional: segment info for audio sources */
  segments?: { startTime: number; endTime: number; text: string }[];
}

/**
 * Extract actionable ideas from text content using an LLM.
 * Validates LLM output against a zod schema to ensure structured results.
 */
export async function extractIdeas(options: ExtractIdeasOptions): Promise<IdeaRecord[]> {
  const { text, sourceUrl, sourceHash, llm, segments } = options;

  // Chunk text if it's very long (>15k chars) to stay within context limits
  const chunks = chunkText(text, 15000);
  const allIdeas: IdeaRecord[] = [];

  for (const chunk of chunks) {
    const response = await llm.chat(EXTRACT_IDEAS_SYSTEM, EXTRACT_IDEAS_USER(chunk.text));

    // Parse JSON from LLM response (handle markdown code fences)
    const json = extractJson(response);
    if (!json) {
      continue; // Skip chunks that don't produce valid JSON
    }

    // Validate against schema
    const parsed = extractedIdeasResponseSchema.safeParse(json);
    if (!parsed.success) {
      // Try to salvage partial results
      const partial = salvagePartialIdeas(json);
      if (partial.length === 0) continue;

      for (const idea of partial) {
        allIdeas.push(
          buildIdeaRecord(idea, sourceUrl, sourceHash, chunk.startParagraph, chunk.endParagraph, segments)
        );
      }
      continue;
    }

    for (const idea of parsed.data) {
      allIdeas.push(
        buildIdeaRecord(idea, sourceUrl, sourceHash, chunk.startParagraph, chunk.endParagraph, segments)
      );
    }
  }

  return allIdeas;
}

function buildIdeaRecord(
  idea: ExtractedIdeaLLM,
  sourceUrl: string,
  sourceHash: string,
  startParagraph: number,
  endParagraph: number,
  segments?: { startTime: number; endTime: number; text: string }[]
): IdeaRecord {
  const segment: SourceSegment = segments
    ? {
        startTime: segments[0]?.startTime,
        endTime: segments[segments.length - 1]?.endTime,
        rawText: idea.description,
      }
    : {
        startParagraph,
        endParagraph,
        rawText: idea.description,
      };

  return {
    id: randomUUID(),
    sourceUrl,
    sourceHash,
    segment,
    idea: {
      title: idea.title,
      description: idea.description,
      domain: idea.domain,
      applicability: idea.applicability,
      patternType: idea.patternType,
    },
    embedding: [], // Populated later by embedding step
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Extract JSON from an LLM response that may contain markdown code fences.
 */
function extractJson(response: string): unknown | null {
  // Try to find JSON in code fences
  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1] : response.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to find array in the response
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Try to salvage individual valid ideas from a partially valid array.
 */
function salvagePartialIdeas(data: unknown): ExtractedIdeaLLM[] {
  if (!Array.isArray(data)) return [];

  const results: ExtractedIdeaLLM[] = [];
  for (const item of data) {
    const parsed = extractedIdeasResponseSchema.element.safeParse(item);
    if (parsed.success) {
      results.push(parsed.data);
    }
  }
  return results;
}

interface TextChunk {
  text: string;
  startParagraph: number;
  endParagraph: number;
}

/**
 * Split text into chunks of approximately maxChars, breaking at paragraph boundaries.
 */
function chunkText(text: string, maxChars: number): TextChunk[] {
  if (text.length <= maxChars) {
    return [{ text, startParagraph: 0, endParagraph: 0 }];
  }

  const paragraphs = text.split(/\n\n+/);
  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let startIdx = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    if (currentChunk.length + paragraphs[i].length > maxChars && currentChunk.length > 0) {
      chunks.push({ text: currentChunk.trim(), startParagraph: startIdx, endParagraph: i - 1 });
      currentChunk = "";
      startIdx = i;
    }
    currentChunk += paragraphs[i] + "\n\n";
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      startParagraph: startIdx,
      endParagraph: paragraphs.length - 1,
    });
  }

  return chunks;
}
