import { spawn } from "node:child_process";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  clearSessionToken,
  getSessionToken,
  getToken,
  lastTokenStorage,
  saveSessionToken,
} from "@fondof/core";
import { apiBase } from "../lib/api.js";

export const loginCommand = new Command("login")
  .description("Sign in to fondof (session for compose quota / sharing)")
  .option("--github-token <token>", "Exchange an existing GitHub token")
  .option("--logout", "Clear the stored fondof session")
  .option("--no-browser", "Print the URL; do not open a browser")
  .action(async (options: {
    githubToken?: string;
    logout?: boolean;
    browser?: boolean;
  }) => {
    console.log(chalk.bold("\n  fondof login\n"));

    if (options.logout) {
      clearSessionToken();
      console.log(chalk.green("  Signed out. Fondof session cleared.\n"));
      return;
    }

    const existing = getSessionToken();
    if (existing && !options.githubToken) {
      const me = await fetchMe(existing);
      if (me?.authenticated) {
        console.log(
          chalk.green(
            `  Already signed in as ${chalk.white(me.user?.login ?? "user")} (plan: ${me.plan}).\n`,
          ),
        );
        console.log(
          chalk.dim(
            `  Use ${chalk.white("fondof login --logout")} to sign out, or ${chalk.white("fondof compose")} to forge.\n`,
          ),
        );
        return;
      }
    }

    // Fast path: exchange GitHub token from connect / env / flag
    const gh = options.githubToken?.trim() || getToken();
    if (gh) {
      const spinner = ora("Exchanging GitHub token for fondof session...").start();
      try {
        const res = await fetch(`${apiBase()}/api/auth/cli/github`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: gh }),
        });
        const body = (await res.json()) as {
          token?: string;
          user?: { login: string };
          error?: string;
        };
        if (!res.ok || !body.token) {
          spinner.fail(body.error || "GitHub token exchange failed");
          console.log(
            chalk.dim(
              "  Falling back to browser login…\n",
            ),
          );
        } else {
          saveSessionToken(body.token);
          spinner.succeed(
            `Signed in as ${body.user?.login ?? "user"}`,
          );
          printStored();
          return;
        }
      } catch (e) {
        spinner.fail(e instanceof Error ? e.message : "Exchange failed");
        console.log(chalk.dim("  Falling back to browser login…\n"));
      }
    }

    // Device flow via fondof API (browser → GitHub → poll)
    const startSpinner = ora("Starting CLI login…").start();
    let start: {
      deviceCode: string;
      userCode: string;
      verificationUri: string;
      interval: number;
      expiresIn: number;
    };
    try {
      const res = await fetch(`${apiBase()}/api/auth/cli/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      start = (await res.json()) as typeof start;
      if (!res.ok || !start.deviceCode) {
        startSpinner.fail("Could not start login");
        console.error(chalk.red(`  ${JSON.stringify(start)}\n`));
        process.exit(1);
      }
      startSpinner.stop();
    } catch (e) {
      startSpinner.fail(e instanceof Error ? e.message : "Start failed");
      process.exit(1);
    }

    console.log(chalk.bold("  Open this URL and sign in with GitHub:"));
    console.log(chalk.cyan(`  ${start.verificationUri}\n`));
    console.log(chalk.dim(`  Code: ${chalk.yellow(start.userCode)}\n`));

    if (options.browser !== false) {
      openUrl(start.verificationUri);
    }

    const pollSpinner = ora("Waiting for authorization…").start();
    const deadline = Date.now() + (start.expiresIn || 900) * 1000;
    const intervalMs = Math.max(2, start.interval || 3) * 1000;

    while (Date.now() < deadline) {
      await sleep(intervalMs);
      try {
        const res = await fetch(`${apiBase()}/api/auth/cli/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode: start.deviceCode }),
        });
        const body = (await res.json()) as {
          status?: string;
          token?: string;
          user?: { login: string };
          error?: string;
        };
        if (body.status === "pending") continue;
        if (body.status === "ready" && body.token) {
          saveSessionToken(body.token);
          pollSpinner.succeed(
            `Signed in as ${body.user?.login ?? "user"}`,
          );
          printStored();
          return;
        }
        if (body.status === "expired" || res.status === 400) {
          pollSpinner.fail(body.error || "Login expired");
          process.exit(1);
        }
      } catch {
        // keep polling through transient network errors
      }
    }

    pollSpinner.fail("Login timed out");
    process.exit(1);
  });

function printStored(): void {
  const where =
    lastTokenStorage() === "keychain"
      ? "the OS credential vault"
      : "~/.fondof/config.json (owner-only)";
  console.log(chalk.green(`  Session saved in ${where}\n`));
  console.log(
    chalk.dim(
      `  Next: ${chalk.white("fondof compose <url> [<url2>] -o .cursor/rules/skill.md")}\n`,
    ),
  );
}

async function fetchMe(token: string): Promise<{
  authenticated?: boolean;
  plan?: string;
  user?: { login: string };
} | null> {
  try {
    const res = await fetch(`${apiBase()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await res.json()) as {
      authenticated?: boolean;
      plan?: string;
      user?: { login: string };
    };
  } catch {
    return null;
  }
}

function openUrl(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  try {
    spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    // user can open manually
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
