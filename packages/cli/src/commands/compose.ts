import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getSessionToken } from "@fondof/core";
import { apiBase } from "../lib/api.js";

export const composeCommand = new Command("compose")
  .description(
    "Forge a fitted skill from URL(s) or a need via the fondof API (one shot)",
  )
  .argument("[urls...]", "Source URL(s) — YouTube, blog, docs (prefer multiple in one call)")
  .option("-n, --need <text>", "Compose from a stated need instead of URLs")
  .option("-r, --repo <owner/name>", "Target repo (default: git remote origin)")
  .option("-o, --output <path>", "Write markdown to this path")
  .option("--share", "Public share (unlocks unlimited forges when signed in)")
  .option("--top-shards <n>", "Ideas to forge (default 2/3, max 6)", parseInt)
  .option("--print", "Print markdown to stdout (default when -o omitted)")
  .action(
    async (
      urls: string[],
      options: {
        need?: string;
        repo?: string;
        output?: string;
        share?: boolean;
        topShards?: number;
        print?: boolean;
      },
    ) => {
      console.log(chalk.bold("\n  fondof compose\n"));

      const need = options.need?.trim();
      const sourceUrls = (urls ?? []).map((u) => u.trim()).filter(Boolean);

      if (!need && sourceUrls.length === 0) {
        console.error(
          chalk.red(
            "  Provide URL(s) and/or --need. Example:\n  fondof compose https://youtu.be/… https://example.com/blog -o .cursor/rules/skill.md\n",
          ),
        );
        process.exit(1);
      }
      if (need && sourceUrls.length > 0) {
        console.error(
          chalk.red("  Use either URL(s) or --need, not both.\n"),
        );
        process.exit(1);
      }

      const repo = options.repo?.trim() || detectGitRepo() || undefined;
      const session = getSessionToken();
      if (!session) {
        console.log(
          chalk.yellow(
            "  No fondof session — composing anonymously (3 forges/month per IP).",
          ),
        );
        console.log(
          chalk.dim(
            `  Run ${chalk.white("fondof login")} to sign in and unlock share-to-unlimited.\n`,
          ),
        );
      }

      const body: Record<string, unknown> = {};
      if (need) body.need = need;
      else if (sourceUrls.length === 1) body.url = sourceUrls[0];
      else body.urls = sourceUrls;
      if (repo) body.repo = repo;
      if (options.topShards) body.topShards = options.topShards;
      if (options.share) body.private = false;

      const spinner = ora(
        sourceUrls.length > 1
          ? `Composing from ${sourceUrls.length} sources…`
          : "Composing…",
      ).start();

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (session) headers.Authorization = `Bearer ${session}`;

        const res = await fetch(`${apiBase()}/api/compose`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as {
          markdown?: string;
          title?: string;
          skillHash?: string;
          skillUrl?: string | null;
          fittedTo?: string;
          plan?: string;
          remaining?: number | null;
          error?: string;
          code?: string;
          unlock?: string[];
          hint?: string;
          sourceUrls?: string[];
        };

        if (!res.ok || !data.markdown) {
          spinner.fail(data.error || `Compose failed (${res.status})`);
          if (data.code === "quota_exceeded") {
            console.error(chalk.red(`\n  ${data.error}`));
            if (data.hint) console.error(chalk.dim(`  ${data.hint}`));
            console.error(
              chalk.dim(
                `\n  Fix: ${chalk.white("fondof login")} then retry` +
                  (session
                    ? `, or ${chalk.white("fondof compose … --share")}`
                    : "") +
                  ".\n  Do not invent a skill when compose fails.\n",
              ),
            );
          }
          process.exit(1);
        }

        spinner.succeed(data.title || "Skill forged");
        console.log(
          chalk.dim(
            `  fittedTo: ${data.fittedTo ?? "—"}  plan: ${data.plan ?? "—"}  remaining: ${data.remaining ?? "∞"}`,
          ),
        );
        if (data.skillUrl) {
          console.log(chalk.dim(`  skillUrl: ${data.skillUrl}`));
        }
        if (data.sourceUrls?.length) {
          console.log(chalk.dim(`  sources: ${data.sourceUrls.join(", ")}`));
        }

        if (options.output) {
          const path = resolve(process.cwd(), options.output);
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, data.markdown, "utf8");
          console.log(chalk.green(`\n  Wrote ${path}\n`));
        } else {
          console.log("\n" + data.markdown + "\n");
        }
      } catch (e) {
        spinner.fail(e instanceof Error ? e.message : "Compose failed");
        process.exit(1);
      }
    },
  );

function detectGitRepo(): string | null {
  try {
    const r = spawnSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
    });
    if (r.status !== 0) return null;
    const url = (r.stdout || "").trim();
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/i);
    if (!m) return null;
    return `${m[1]}/${m[2]}`;
  } catch {
    return null;
  }
}
