import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RepoProfile } from "@fondof/shared";
import {
  assertSafeFile,
  ensurePrivateDir,
  fondofHome,
  writePrivateFile,
} from "./private-fs.js";
import {
  clearSessionFromKeychain,
  readSessionFromKeychain,
  readTokenFromKeychain,
  saveSessionToKeychain,
  saveTokenToKeychain,
} from "./keychain.js";

export interface FondofConfig {
  githubToken?: string;
  /** Fondof API session (compose / billing) — prefer OS vault. */
  sessionToken?: string;
  githubClientId?: string;
}

export type TokenStorage = "keychain" | "file";

type KeychainFns = {
  save: (token: string) => boolean;
  read: () => string | null;
  saveSession?: (token: string) => boolean;
  readSession?: () => string | null;
  clearSession?: () => void;
};

let keychain: KeychainFns = {
  save: saveTokenToKeychain,
  read: readTokenFromKeychain,
  saveSession: saveSessionToKeychain,
  readSession: readSessionFromKeychain,
  clearSession: clearSessionFromKeychain,
};

let lastStorage: TokenStorage = "file";
let lastConfigWasBroadlyReadable = false;

/** Test-only. Pass `null` to restore the OS vault. */
export function setKeychainForTests(next: KeychainFns | null): void {
  keychain = next ?? {
    save: saveTokenToKeychain,
    read: readTokenFromKeychain,
    saveSession: saveSessionToKeychain,
    readSession: readSessionFromKeychain,
    clearSession: clearSessionFromKeychain,
  };
}

export function lastTokenStorage(): TokenStorage {
  return lastStorage;
}

export function lastConfigWasWorldReadable(): boolean {
  return lastConfigWasBroadlyReadable;
}

function configDir(): string {
  return fondofHome();
}

function configFile(): string {
  return join(configDir(), "config.json");
}

function reposFile(): string {
  return join(configDir(), "repos.json");
}

/**
 * Load fondof configuration. Tightens ~/.fondof permissions; does not follow
 * symlinks. A GitHub token in this file is a fallback — prefer the OS vault.
 */
export function loadConfig(): FondofConfig {
  ensurePrivateDir(configDir());
  const file = configFile();
  if (!existsSync(file)) {
    lastConfigWasBroadlyReadable = false;
    return {};
  }
  lastConfigWasBroadlyReadable = assertSafeFile(file).wasBroadlyReadable;
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as FondofConfig;
  } catch {
    return {};
  }
}

/**
 * Save fondof configuration (owner-only file). Do not put tokens here when
 * the OS keychain accepted them.
 */
export function saveConfig(config: FondofConfig): void {
  writePrivateFile(configFile(), JSON.stringify(config, null, 2));
}

/**
 * Get the stored GitHub token.
 * Order: GITHUB_TOKEN env, OS keychain, then owner-only config file.
 */
export function getToken(): string | null {
  const fromEnv = process.env.GITHUB_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const fromVault = keychain.read();
  if (fromVault) return fromVault;
  const config = loadConfig();
  return config.githubToken ?? null;
}

/**
 * Save a GitHub token. Prefers the OS credential vault; falls back to
 * ~/.fondof/config.json with mode 0600.
 */
export function saveToken(token: string): void {
  if (keychain.save(token)) {
    lastStorage = "keychain";
    const config = loadConfig();
    if (config.githubToken) {
      delete config.githubToken;
      saveConfig(config);
    }
    return;
  }
  lastStorage = "file";
  const config = loadConfig();
  config.githubToken = token;
  saveConfig(config);
}

/**
 * Fondof API session token (for Authorization: Bearer on compose).
 * Order: FONDOF_TOKEN env, OS vault, config file.
 */
export function getSessionToken(): string | null {
  const fromEnv = process.env.FONDOF_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const fromVault = keychain.readSession?.() ?? null;
  if (fromVault) return fromVault;
  const config = loadConfig();
  return config.sessionToken ?? null;
}

export function saveSessionToken(token: string): void {
  if (keychain.saveSession?.(token)) {
    lastStorage = "keychain";
    const config = loadConfig();
    if (config.sessionToken) {
      delete config.sessionToken;
      saveConfig(config);
    }
    return;
  }
  lastStorage = "file";
  const config = loadConfig();
  config.sessionToken = token;
  saveConfig(config);
}

export function clearSessionToken(): void {
  keychain.clearSession?.();
  const config = loadConfig();
  if (config.sessionToken) {
    delete config.sessionToken;
    saveConfig(config);
  }
}

/**
 * Load all stored repo profiles.
 */
export function loadRepoProfiles(): RepoProfile[] {
  ensurePrivateDir(configDir());
  const file = reposFile();
  if (!existsSync(file)) return [];
  assertSafeFile(file);
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as RepoProfile[];
  } catch {
    return [];
  }
}

/**
 * Save a repo profile (upsert by fullName).
 */
export function saveRepoProfile(profile: RepoProfile): void {
  const profiles = loadRepoProfiles();
  const existingIdx = profiles.findIndex((p) => p.fullName === profile.fullName);

  if (existingIdx >= 0) {
    profiles[existingIdx] = profile;
  } else {
    profiles.push(profile);
  }

  writePrivateFile(reposFile(), JSON.stringify(profiles, null, 2));
}

/**
 * Remove a repo profile by fullName.
 */
export function removeRepoProfile(fullName: string): void {
  const profiles = loadRepoProfiles().filter((p) => p.fullName !== fullName);
  writePrivateFile(reposFile(), JSON.stringify(profiles, null, 2));
}
