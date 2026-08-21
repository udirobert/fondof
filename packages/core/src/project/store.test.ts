import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writePrivateFile } from "./private-fs.js";
import {
  getToken,
  loadConfig,
  saveConfig,
  saveToken,
  setKeychainForTests,
} from "./store.js";

const posix = process.platform !== "win32";

let home: string;
let prevHome: string | undefined;
let prevToken: string | undefined;

beforeEach(() => {
  prevHome = process.env.FONDOF_HOME;
  prevToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  home = mkdtempSync(join(tmpdir(), "fondof-home-"));
  process.env.FONDOF_HOME = home;
  setKeychainForTests({ save: () => false, read: () => null });
});

afterEach(() => {
  setKeychainForTests(null);
  if (prevHome === undefined) delete process.env.FONDOF_HOME;
  else process.env.FONDOF_HOME = prevHome;
  if (prevToken === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = prevToken;
  rmSync(home, { recursive: true, force: true });
});

describe("owner-only config files", () => {
  it.skipIf(!posix)("creates ~/.fondof at 0700 and config.json at 0600", () => {
    saveConfig({ githubClientId: "dev" });
    const dirMode = lstatSync(home).mode & 0o777;
    const fileMode = lstatSync(join(home, "config.json")).mode & 0o777;
    expect(dirMode).toBe(0o700);
    expect(fileMode).toBe(0o600);
  });

  it.skipIf(!posix)("tightens a previously world-readable config before reading", () => {
    mkdirSync(home, { recursive: true });
    const file = join(home, "config.json");
    writeFileSync(file, JSON.stringify({ githubToken: "gho_old" }), {
      mode: 0o644,
    });
    chmodSync(file, 0o644);
    expect(loadConfig().githubToken).toBe("gho_old");
    expect(lstatSync(file).mode & 0o777).toBe(0o600);
  });

  it.skipIf(!posix)("refuses a symlinked config file", () => {
    mkdirSync(home, { recursive: true });
    const target = join(home, "elsewhere.json");
    writeFileSync(target, "{}");
    symlinkSync(target, join(home, "config.json"));
    expect(() => saveConfig({ githubClientId: "x" })).toThrow(/symlink/);
  });

  it("writes atomically via writePrivateFile", () => {
    writePrivateFile(join(home, "config.json"), '{"ok":true}');
    expect(JSON.parse(readFileSync(join(home, "config.json"), "utf-8"))).toEqual({
      ok: true,
    });
  });
});

describe("GitHub token storage", () => {
  it("falls back to an owner-only config file when the vault is unavailable", () => {
    saveToken("gho_file");
    expect(getToken()).toBe("gho_file");
    expect(JSON.parse(readFileSync(join(home, "config.json"), "utf-8"))).toMatchObject({
      githubToken: "gho_file",
    });
  });

  it("prefers the OS vault and strips the token from the config file", () => {
    let vault: string | null = null;
    setKeychainForTests({
      save: (token) => {
        vault = token;
        return true;
      },
      read: () => vault,
    });
    mkdirSync(home, { recursive: true });
    writeFileSync(
      join(home, "config.json"),
      JSON.stringify({ githubToken: "gho_old", githubClientId: "dev" }),
    );
    saveToken("gho_vault");
    expect(getToken()).toBe("gho_vault");
    const onDisk = JSON.parse(readFileSync(join(home, "config.json"), "utf-8")) as {
      githubToken?: string;
      githubClientId?: string;
    };
    expect(onDisk.githubToken).toBeUndefined();
    expect(onDisk.githubClientId).toBe("dev");
  });

  it("prefers GITHUB_TOKEN over stored credentials", () => {
    saveToken("gho_file");
    process.env.GITHUB_TOKEN = "gho_env";
    expect(getToken()).toBe("gho_env");
  });
});
