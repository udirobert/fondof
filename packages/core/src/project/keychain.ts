/**
 * OS credential vault for the GitHub token.
 * macOS Keychain (`security`) and Linux Secret Service (`secret-tool`) when
 * available; callers fall back to an owner-only config file.
 */

import { spawnSync } from "node:child_process";
import { userInfo } from "node:os";

const SERVICE = "fondof.github";
const ACCOUNT = "github";

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

function saveDarwin(token: string): boolean {
  const { status } = run("security", [
    "add-generic-password",
    "-s",
    SERVICE,
    "-a",
    userInfo().username,
    "-w",
    token,
    "-U",
  ]);
  return status === 0;
}

function readDarwin(): string | null {
  const { status, stdout } = run("security", [
    "find-generic-password",
    "-s",
    SERVICE,
    "-a",
    userInfo().username,
    "-w",
  ]);
  if (status !== 0) return null;
  const token = stdout.trim();
  return token || null;
}

function saveLibsecret(token: string): boolean {
  const { status } = run(
    "secret-tool",
    [
      "store",
      "--label=fondof GitHub token",
      "service",
      SERVICE,
      "account",
      ACCOUNT,
    ],
    { input: token },
  );
  return status === 0;
}

function readLibsecret(): string | null {
  const { status, stdout } = run("secret-tool", [
    "lookup",
    "service",
    SERVICE,
    "account",
    ACCOUNT,
  ]);
  if (status !== 0) return null;
  const token = stdout.trim();
  return token || null;
}

export function saveTokenToKeychain(token: string): boolean {
  if (process.platform === "darwin") return saveDarwin(token);
  if (process.platform === "linux") return saveLibsecret(token);
  return false;
}

export function readTokenFromKeychain(): string | null {
  if (process.platform === "darwin") return readDarwin();
  if (process.platform === "linux") return readLibsecret();
  return null;
}
