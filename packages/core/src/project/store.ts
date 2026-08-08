import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { RepoProfile } from "@fondof/shared";

export interface FondofConfig {
  githubToken?: string;
  githubClientId?: string;
}

const CONFIG_DIR = join(homedir(), ".fondof");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const REPOS_FILE = join(CONFIG_DIR, "repos.json");

/**
 * Ensure the fondof config directory exists.
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load fondof configuration.
 */
export function loadConfig(): FondofConfig {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as FondofConfig;
  } catch {
    return {};
  }
}

/**
 * Save fondof configuration.
 */
export function saveConfig(config: FondofConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Get the stored GitHub token.
 */
export function getToken(): string | null {
  const config = loadConfig();
  return config.githubToken ?? process.env.GITHUB_TOKEN ?? null;
}

/**
 * Save a GitHub token.
 */
export function saveToken(token: string): void {
  const config = loadConfig();
  config.githubToken = token;
  saveConfig(config);
}

/**
 * Load all stored repo profiles.
 */
export function loadRepoProfiles(): RepoProfile[] {
  ensureConfigDir();
  if (!existsSync(REPOS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(REPOS_FILE, "utf-8")) as RepoProfile[];
  } catch {
    return [];
  }
}

/**
 * Save a repo profile (upsert by fullName).
 */
export function saveRepoProfile(profile: RepoProfile): void {
  ensureConfigDir();
  const profiles = loadRepoProfiles();
  const existingIdx = profiles.findIndex((p) => p.fullName === profile.fullName);

  if (existingIdx >= 0) {
    profiles[existingIdx] = profile;
  } else {
    profiles.push(profile);
  }

  writeFileSync(REPOS_FILE, JSON.stringify(profiles, null, 2), "utf-8");
}

/**
 * Remove a repo profile by fullName.
 */
export function removeRepoProfile(fullName: string): void {
  ensureConfigDir();
  const profiles = loadRepoProfiles().filter((p) => p.fullName !== fullName);
  writeFileSync(REPOS_FILE, JSON.stringify(profiles, null, 2), "utf-8");
}
