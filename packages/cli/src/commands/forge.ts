import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { compose, loadRepoProfiles, type ComposeResult } from "@fondof/core";
import type { IdeaRecord } from "@fondof/shared";
import { createClaudeLLM } from "../llm.js";

export const forgeCommand = new Command("forge")
  .description("Forge a skill from extracted ideas, fitted to your repo")
  .option("-r, --repo <name>", "Target repository (owner/repo)")
  .option("-o, --output <path>", "Output path for the skill file")
  .option("--dry-run", "Show the skill draft without saving")
  .action(async (options: { repo?: string; output?: string; dryRun?: boolean }) => {
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
        console.error(chalk.red(`  Repository "${options.repo}" not found in indexed repos.\n`));
        console.error(chalk.dim(`  Available: ${repos.map((r) => r.fullName).join(", ")}\n`));
        process.exit(1);
      }
    } else {
      // Use first (most recently indexed) repo
      targetRepo = repos[0];
    }

    console.log(chalk.dim(`  Target repo: ${targetRepo.fullName}`));
    console.log(chalk.dim(`  Stack: ${targetRepo.frameworks.join(", ") || targetRepo.languages[0]?.language || "unknown"}\n`));

    // For now, create a demo idea to forge from
    // In the full flow, ideas would come from a previous ingest + discovery
    const demoIdeas = getDemoIdeas();

    console.log(chalk.dim(`  Composing from ${demoIdeas.length} idea(s)...\n`));

    const llm = createClaudeLLM();
    const spinner = ora("Forging skill...").start();

    let result: ComposeResult;
    try {
      result = await compose({
        ideas: demoIdeas,
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
      console.log(chalk.yellow("\n  ⚠ Potential conflicts detected:\n"));
      for (const conflict of result.conflicts.conflicts) {
        console.log(
          chalk.yellow(`  • [${conflict.severity}] ${conflict.description}`)
        );
      }
      console.log();
    }

    // Display the draft
    console.log(chalk.bold(`\n  ── ${result.draft.title} ──\n`));
    console.log(chalk.dim("  Domain: ") + chalk.cyan(result.draft.domain.join(", ")));
    console.log(chalk.dim("  Applies to: ") + result.draft.applicability.join(", "));
    console.log(chalk.dim("  Sources: ") + result.draft.sources.map((s) => s.contribution).join(", "));
    console.log(chalk.dim(`  Fitted to: ${result.draft.provenance.fittedTo}`));
    console.log();

    // Show preview of content
    const preview = result.draft.content.guidance.slice(0, 400);
    console.log(chalk.dim("  Preview:"));
    console.log(chalk.dim("  ─────────"));
    for (const line of preview.split("\n")) {
      console.log(chalk.dim(`  ${line}`));
    }
    if (result.draft.content.guidance.length > 400) {
      console.log(chalk.dim("  ..."));
    }
    console.log();

    // Save or show
    if (options.dryRun) {
      console.log(chalk.dim("  [dry-run] Full markdown:\n"));
      console.log(result.draft.markdown);
      return;
    }

    // Determine output path
    const outputPath = options.output ?? getDefaultOutputPath(result.draft.title);
    const outputDir = join(process.cwd(), ".kiro", "steering");

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const fullPath = join(outputDir, outputPath);
    writeFileSync(fullPath, result.draft.markdown, "utf-8");

    console.log(chalk.green(`  ✓ Skill saved to: ${fullPath}`));
    console.log(
      chalk.dim(`\n  Provenance hash: ${result.draft.provenance.sourceHashes[0]?.slice(0, 12)}...`)
    );
    console.log(
      chalk.dim(`  To publish with attestation: ${chalk.white("fondof publish")}\n`)
    );
  });

/**
 * Generate a filename from a skill title.
 */
function getDefaultOutputPath(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) + ".md"
  );
}

/**
 * Placeholder: in the real flow, ideas come from ingest + discovery.
 * This provides a demo idea for testing the forge flow independently.
 */
function getDemoIdeas(): IdeaRecord[] {
  return [
    {
      id: "demo-1",
      sourceUrl: "https://example.com/podcast/ep-42",
      sourceHash: "abc123def456",
      segment: {
        startTime: 120,
        endTime: 360,
        rawText:
          "When handling errors in async code, the key insight is to propagate context about where the error originated. Wrapping errors with additional context at each layer creates a trail that makes debugging much faster. The pattern is: catch, wrap with context, re-throw.",
      },
      idea: {
        title: "Contextual Error Propagation",
        description:
          "Wrap errors at each async boundary with context about what operation was being attempted. This creates a debugging trail without losing the original error.",
        domain: ["error-handling", "debugging"],
        applicability: ["async", "typescript", "distributed-systems"],
        patternType: "technique",
      },
      embedding: [],
      extractedAt: new Date().toISOString(),
    },
  ];
}
