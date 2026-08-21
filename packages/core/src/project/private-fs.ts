/**
 * Owner-only files under ~/.fondof (or $FONDOF_HOME).
 * Directory 0700, files 0600, no symlinks, must be owned by the current user.
 */

import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

export function fondofHome(): string {
  const override = process.env.FONDOF_HOME?.trim();
  return override || join(homedir(), ".fondof");
}

function isPosix(): boolean {
  return process.platform !== "win32";
}

function currentUid(): number | null {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

export function ensurePrivateDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: DIR_MODE });
  }
  if (!isPosix()) return;

  const st = lstatSync(dir);
  if (st.isSymbolicLink()) {
    throw new Error("fondof config directory must not be a symlink");
  }
  if (!st.isDirectory()) {
    throw new Error("fondof config path is not a directory");
  }
  const uid = currentUid();
  if (uid != null && st.uid !== uid) {
    throw new Error("fondof config directory is not owned by the current user");
  }
  chmodSync(dir, DIR_MODE);
}

/**
 * Refuse to follow a symlink or a file owned by someone else.
 * Returns whether the file existed and was group/world-readable before hardening.
 */
export function assertSafeFile(file: string): { exists: boolean; wasBroadlyReadable: boolean } {
  if (!existsSync(file)) return { exists: false, wasBroadlyReadable: false };
  if (!isPosix()) return { exists: true, wasBroadlyReadable: false };

  const st = lstatSync(file);
  if (st.isSymbolicLink()) {
    throw new Error("refusing to use a symlinked fondof config file");
  }
  if (!st.isFile()) {
    throw new Error("fondof config path is not a regular file");
  }
  const uid = currentUid();
  if (uid != null && st.uid !== uid) {
    throw new Error("fondof config file is not owned by the current user");
  }
  const wasBroadlyReadable = (st.mode & 0o077) !== 0;
  chmodSync(file, FILE_MODE);
  return { exists: true, wasBroadlyReadable };
}

/** Atomic write: temp file in the same directory, mode 0600, then rename. */
export function writePrivateFile(file: string, contents: string): void {
  ensurePrivateDir(dirname(file));
  if (existsSync(file)) assertSafeFile(file);

  const tmp = join(
    dirname(file),
    `.${basename(file)}.${randomBytes(8).toString("hex")}.tmp`,
  );
  try {
    writeFileSync(tmp, contents, {
      encoding: "utf-8",
      mode: FILE_MODE,
      flag: "wx",
    });
    if (isPosix()) chmodSync(tmp, FILE_MODE);
    renameSync(tmp, file);
    if (isPosix()) chmodSync(file, FILE_MODE);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // tmp may not exist
    }
    throw err;
  }
}
