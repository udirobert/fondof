import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { IdeaRecord } from "@fondof/shared";
import {
  assertSafeFile,
  ensurePrivateDir,
  fondofHome,
  writePrivateFile,
} from "./private-fs.js";

function ideasFile(): string {
  return join(fondofHome(), "ideas.json");
}

function sessionsFile(): string {
  return join(fondofHome(), "sessions.json");
}

export interface IngestSession {
  /** Unique session ID */
  id: string;
  /** Source URL that was ingested */
  sourceUrl: string;
  /** Source content hash */
  sourceHash: string;
  /** Content type detected */
  contentType: "audio" | "article" | "text";
  /** Title if article */
  title?: string;
  /** Author if detected */
  author?: string;
  /** IDs of ideas extracted in this session */
  ideaIds: string[];
  /** Timestamp of ingestion */
  ingestedAt: string;
}

/**
 * Load all persisted ideas.
 */
export function loadIdeas(): IdeaRecord[] {
  ensurePrivateDir(fondofHome());
  const file = ideasFile();
  if (!existsSync(file)) return [];
  assertSafeFile(file);
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as IdeaRecord[];
  } catch {
    return [];
  }
}

/**
 * Save ideas (appends new, deduplicates by ID).
 */
export function saveIdeas(newIdeas: IdeaRecord[]): void {
  const existing = loadIdeas();
  const existingIds = new Set(existing.map((i) => i.id));
  const merged = [...existing, ...newIdeas.filter((i) => !existingIds.has(i.id))];
  writePrivateFile(ideasFile(), JSON.stringify(merged, null, 2));
}

/**
 * Get ideas by IDs.
 */
export function getIdeasByIds(ids: string[]): IdeaRecord[] {
  const all = loadIdeas();
  const idSet = new Set(ids);
  return all.filter((i) => idSet.has(i.id));
}

/**
 * Get ideas from a specific source URL.
 */
export function getIdeasBySource(sourceUrl: string): IdeaRecord[] {
  return loadIdeas().filter((i) => i.sourceUrl === sourceUrl);
}

/**
 * Get the N most recent ideas.
 */
export function getRecentIdeas(limit = 20): IdeaRecord[] {
  return loadIdeas()
    .sort((a, b) => new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime())
    .slice(0, limit);
}

/**
 * Load all ingest sessions.
 */
export function loadSessions(): IngestSession[] {
  ensurePrivateDir(fondofHome());
  const file = sessionsFile();
  if (!existsSync(file)) return [];
  assertSafeFile(file);
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as IngestSession[];
  } catch {
    return [];
  }
}

/**
 * Save a new ingest session.
 */
export function saveSession(session: IngestSession): void {
  const sessions = loadSessions();
  sessions.push(session);
  writePrivateFile(sessionsFile(), JSON.stringify(sessions, null, 2));
}

/**
 * Get the most recent session.
 */
export function getLatestSession(): IngestSession | null {
  const sessions = loadSessions();
  if (sessions.length === 0) return null;
  return sessions[sessions.length - 1];
}
