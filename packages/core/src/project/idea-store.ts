import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { IdeaRecord } from "@fondof/shared";

const CONFIG_DIR = join(homedir(), ".fondof");
const IDEAS_FILE = join(CONFIG_DIR, "ideas.json");
const SESSIONS_FILE = join(CONFIG_DIR, "sessions.json");

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

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// --- Ideas ---

/**
 * Load all persisted ideas.
 */
export function loadIdeas(): IdeaRecord[] {
  ensureDir();
  if (!existsSync(IDEAS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(IDEAS_FILE, "utf-8")) as IdeaRecord[];
  } catch {
    return [];
  }
}

/**
 * Save ideas (appends new, deduplicates by ID).
 */
export function saveIdeas(newIdeas: IdeaRecord[]): void {
  ensureDir();
  const existing = loadIdeas();
  const existingIds = new Set(existing.map((i) => i.id));
  const merged = [...existing, ...newIdeas.filter((i) => !existingIds.has(i.id))];
  writeFileSync(IDEAS_FILE, JSON.stringify(merged, null, 2), "utf-8");
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

// --- Sessions ---

/**
 * Load all ingest sessions.
 */
export function loadSessions(): IngestSession[] {
  ensureDir();
  if (!existsSync(SESSIONS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(SESSIONS_FILE, "utf-8")) as IngestSession[];
  } catch {
    return [];
  }
}

/**
 * Save a new ingest session.
 */
export function saveSession(session: IngestSession): void {
  ensureDir();
  const sessions = loadSessions();
  sessions.push(session);
  writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
}

/**
 * Get the most recent session.
 */
export function getLatestSession(): IngestSession | null {
  const sessions = loadSessions();
  if (sessions.length === 0) return null;
  return sessions[sessions.length - 1];
}
