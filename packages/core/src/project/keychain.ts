/**
 * OS credential vault for fondof tokens.
 * macOS Keychain (`security`) and Linux Secret Service (`secret-tool`) when
 * available; callers fall back to an owner-only config file.
 */

import { spawnSync } from "node:child_process";
import { userInfo } from "node:os";

const GITHUB_SERVICE = "fondof.github";
const SESSION_SERVICE = "fondof.session";
const ACCOUNT = "default";

function run(
  command: string,
  args: string[],
  opts?: { input?: string },
): { status: number; stdout: string } {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input: opts?.input,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.error) return { status: 1, stdout: "" };
  return { status: result.status ?? 1, stdout: result.stdout ?? "" };
}

function saveDarwin(service: string, token: string): boolean {
  const { status } = run("security", [
    "add-generic-password",
    "-s",
    service,
    "-a",
    userInfo().username,
    "-w",
    token,
    "-U",
  ]);
  return status === 0;
}

function readDarwin(service: string): string | null {
  const { status, stdout } = run("security", [
    "find-generic-password",
    "-s",
    service,
    "-a",
    userInfo().username,
    "-w",
  ]);
  if (status !== 0) return null;
  const token = stdout.trim();
  return token || null;
}

function deleteDarwin(service: string): boolean {
  const { status } = run("security", [
    "delete-generic-password",
    "-s",
    service,
    "-a",
    userInfo().username,
  ]);
  return status === 0;
}

function saveLibsecret(service: string, label: string, token: string): boolean {
  const { status } = run(
    "secret-tool",
    [
      "store",
      `--label=${label}`,
      "service",
      service,
      "account",
      ACCOUNT,
    ],
    { input: token },
  );
  return status === 0;
}

function readLibsecret(service: string): string | null {
  const { status, stdout } = run("secret-tool", [
    "lookup",
    "service",
    service,
    "account",
    ACCOUNT,
  ]);
  if (status !== 0) return null;
  const token = stdout.trim();
  return token || null;
}

function deleteLibsecret(service: string): boolean {
  const { status } = run("secret-tool", [
    "clear",
    "service",
    service,
    "account",
    ACCOUNT,
  ]);
  return status === 0;
}

export function saveTokenToKeychain(token: string): boolean {
  if (process.platform === "darwin") return saveDarwin(GITHUB_SERVICE, token);
  if (process.platform === "linux") {
    return saveLibsecret(GITHUB_SERVICE, "fondof GitHub token", token);
  }
  return false;
}

export function readTokenFromKeychain(): string | null {
  if (process.platform === "darwin") return readDarwin(GITHUB_SERVICE);
  if (process.platform === "linux") return readLibsecret(GITHUB_SERVICE);
  return null;
}

export function saveSessionToKeychain(token: string): boolean {
  if (process.platform === "darwin") return saveDarwin(SESSION_SERVICE, token);
  if (process.platform === "linux") {
    return saveLibsecret(SESSION_SERVICE, "fondof session token", token);
  }
  return false;
}

export function readSessionFromKeychain(): string | null {
  if (process.platform === "darwin") return readDarwin(SESSION_SERVICE);
  if (process.platform === "linux") return readLibsecret(SESSION_SERVICE);
  return null;
}

export function clearSessionFromKeychain(): void {
  if (process.platform === "darwin") deleteDarwin(SESSION_SERVICE);
  else if (process.platform === "linux") deleteLibsecret(SESSION_SERVICE);
}
