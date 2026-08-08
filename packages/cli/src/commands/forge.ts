import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  compose,
  loadRepoProfiles,
  getIdeasByIds,
  getRecentIdeas,
  getLatestSession,
  type ComposeResult,
} from "@fondof/core";
import type { IdeaRecord } from "@fondof/shared";
import { createLLM } from "../llm.js";

export const forgeCommand = new Command("forge")
  .description("Forge a skill from extracted ideas, fitted to your repo")
  .option("-r, --repo <name>", "Target repository (owner/repo)")
  .option("-i, --ideas <ids>", "Comma-separated idea IDs to forge from")
  .option("--latest", "Use ideas from the most recent ingest session")
  .option("-o, --output <path>", "Output path for the skill file")
  .option("--dry-run", "Show the skill draft without saving")
  .action(async (options: {
    repo?: string;
    ideas?: string;
    latest?: boolean;
    output?: string;
    dryRun?: boolean;
  }) => {
    console.log(chalk.bold("\n  fondof forge\n"));

    // Load repo profiles
    const repos = loadRepoProfiles();
    if (repos.length === 0) {
      console.error(
        chalk.red("  No repositories indexed. Run `fondof connect` first.\n")
      );
      process.exit(1);
    }

    // Select target repo
    let targetRepo;
    if (options.repo) {
      targetRepo = repos.find(
        (r) => r.fullName === options.repo || r.name === options.repo
      );
      if (!targetRepo) {
        console.error(chalk.red(`  Repository "${options.repo}" not found.\n`));
        console.error(chalk.dim(`  Available: ${repos.map((r) => r.fullName).join(", ")}\n`));
        process.exit(1);
      }
    } else {
      targetRepo = repos[0];
    }

    // Select ideas to forge from
    let ideas: IdeaRecord[];

    if (options.ideas) {
      // Specific IDs provided
      const ids = options.ideas.split(",").map((s) => s.trim());
      ideas = getIdeasByIds(ids);
      if (ideas.length === 0) {
        console.error(chalk.red("  No ideas found with those IDs.\n"));
        console.error(chalk.dim("  Run `fondof status` to see available ideas.\n"));
        process.exit(1);
      }
    } else if (options.latest) {
      // Use latest session's ideas
      const session = getLatestSession();
      if (!session) {
        console.error(chalk.red("  No ingest sessions found. Run `fondof ingest <url>` first.\n"));
        process.exit(1);
      }
      ideas = getIdeasByIds(session.ideaIds);
      if (ideas.length === 0) {
        console.error(chalk.red("  No ideas found from latest session.\n"));
        process.exit(1);
      }
      console.log(chalk.dim(`  Using ideas from: ${session.sourceUrl}\n`));
    } else {
      // Default: use recent ideas with recommendation "forge-skill"
      const recent = getRecentIdeas(10);
      if (recent.length === 0) {
        console.error(chalk.red("  No ideas available. Run `fondof ingest <url>` first.\n"));
        process.exit(1);
      }
      // Filter to technique/mental-model types (likely skill-worthy)
      ideas = recent.filter(
        (i) => i.idea.patternType === "technique" || i.idea.patternType === "mental-model"
      );
      if (ideas.length === 0) ideas = recent.slice(0, 3);
    }

    console.log(chalk.dim(`  Target repo: ${targetRepo.fullName}`));
    console.log(chalk.dim(`  Stack: ${targetRepo.frameworks.join(", ") || targetRepo.languages[0]?.language || "unknown"}`));
    console.log(chalk.dim(`  Forging from ${ideas.length} idea(s):\n`));

    for (const idea of ideas) {
      console.log(chalk.dim(`    - ${idea.idea.title} (${idea.idea.patternType})`));
    }
    console.log();

    const llm = createLLM();
    const spinner = ora("Forging skill...").start();

    let result: ComposeResult;
    try {
      result = await compose({
        ideas,
        targetRepo,
        llm,
      });
      spinner.succeed("Skill forged");
    } catch (error) {
      spinner.fail("Forge failed");
      if (error instanceof Error) {
        console.error(chalk.red(`\n  ${error.message}\n`));
      }
      process.exit(1);
    }

    // Show conflicts
    if (result.conflicts.hasConflicts) {
      console.log(chalk.yellow("\n  Potential conflicts:\n"));
      for (const conflict of result.conflicts.conflicts) {
        console.log(chalk.yellow(`  - ${conflict.description}`));
      }
      console.log();
    }

    // Display the draft
    console.log(chalk.bold(`\n  ${result.draft.title}\n`));
    console.log(chalk.dim("  Domain: ") + chalk.cyan(result.draft.domain.join(", ")));
    console.log(chalk.dim("  Applies to: ") + result.draft.applicability.join(", "));
    console.log(chalk.dim("  Sources: ") + result.draft.sources.map((s) => s.contribution).join(", "));
    console.log(chalk.dim(`  Fitted to: ${result.draft.provenance.fittedTo}\n`));

    // Preview
    const previewLines = result.draft.content.guidance.split("\n").slice(0, 12);
    console.log(chalk.dim("  ─── Preview ───"));
    for (const line of previewLines) {
      console.log(chalk.dim(`  ${line}`));
    }
    if (result.draft.content.guidance.split("\n").length > 12) {
      console.log(chalk.dim("  ..."));
    }
    console.log();

    if (options.dryRun) {
      console.log(chalk.dim("  [dry-run] Full markdown:\n"));
      console.log(result.draft.markdown);
      return;
    }

    // Save the skill
    const outputDir = join(process.cwd(), ".kiro", "steering");
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = options.output ?? toFilename(result.draft.title);
    const fullPath = join(outputDir, filename);
    writeFileSync(fullPath, result.draft.markdown, "utf-8");

    console.log(chalk.green(`  Saved: ${fullPath}`));
    console.log(chalk.dim(`\n  Publish with provenance: ${chalk.white(`fondof publish ${fullPath}`)}\n`));
  });

function toFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) + ".md"
  );
}
