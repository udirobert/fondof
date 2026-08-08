import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { forgeSkill, getSkillOnChain, loadPoolConfig } from "@fondof/core";

export const publishCommand = new Command("publish")
  .description("Publish a skill to the SkillPool with provenance and backing")
  .argument("<file>", "Path to the skill markdown file")
  .option("--verify", "Check if a skill is already in the pool (read-only)")
  .action(async (file: string, options: { verify?: boolean }) => {
    console.log(chalk.bold("\n  fondof publish\n"));

    if (!existsSync(file)) {
      console.error(chalk.red(`  File not found: ${file}\n`));
      process.exit(1);
    }

    const content = readFileSync(file, "utf-8");
    const skillHash = createHash("sha256").update(content).digest("hex");
    const sourceHashes = extractSourceHashes(content);

    console.log(chalk.dim(`  File: ${file}`));
    console.log(chalk.dim(`  Skill hash: ${skillHash.slice(0, 16)}...`));
    console.log(chalk.dim(`  Sources: ${sourceHashes.length} provenance hash(es)\n`));

    let config;
    try {
      config = loadPoolConfig();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`  ${error.message}\n`));
      }
      process.exit(1);
    }

    if (options.verify) {
      const spinner = ora("Querying SkillPool on Monad...").start();
      try {
        const skill = await getSkillOnChain(skillHash, config);
        if (skill) {
          spinner.succeed("Skill found in pool");
          console.log(chalk.dim(`\n  Forger: ${skill.forger}`));
          console.log(chalk.dim(`  Backing: ${Number(skill.backing) / 1e18} MON`));
          console.log(chalk.dim(`  Usage count: ${skill.usageCount}`));
          console.log(chalk.dim(`  Signal: ${skill.signal}`));
          console.log(chalk.dim(`  Challenge losses: ${skill.challengeLosses}`));
          console.log(chalk.green(`\n  This skill is live in the SkillPool.\n`));
        } else {
          spinner.info("Skill not found in pool");
          console.log(chalk.dim(`\n  Publish it: fondof publish ${file}\n`));
        }
      } catch (error) {
        spinner.fail("Query failed");
        if (error instanceof Error) {
          console.error(chalk.red(`  ${error.message}\n`));
        }
      }
      return;
    }

    // Publish to SkillPool
    if (sourceHashes.length === 0) {
      console.error(
        chalk.red("  No provenance found in frontmatter.\n") +
          chalk.dim("  Skills must be forged with `fondof forge` to include source hashes.\n")
      );
      process.exit(1);
    }

    const spinner = ora("Publishing to SkillPool on Monad (~300ms)...").start();
    try {
      const receipt = await forgeSkill(skillHash, sourceHashes, config);
      spinner.succeed("Skill published to SkillPool");

      console.log(chalk.dim(`\n  Transaction: ${receipt.txHash}`));
      console.log(chalk.dim(`  Block: ${receipt.blockNumber}`));
      console.log(chalk.green("\n  Your skill is now live. Signal starts at backing amount."));
      console.log(chalk.dim("  As agents use it, your signal grows."));
      console.log(chalk.dim(`  Others can challenge it — if your skill wins, your backing grows.\n`));
      console.log(chalk.dim(`  Verify: ${chalk.white(`fondof publish --verify ${file}`)}\n`));
    } catch (error) {
      spinner.fail("Publish failed");
      if (error instanceof Error) {
        console.error(chalk.red(`\n  ${error.message}\n`));
      }
      process.exit(1);
    }
  });

function extractSourceHashes(content: string): string[] {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];

  const frontmatter = frontmatterMatch[1];
  const hashes: string[] = [];

  const hashMatches = frontmatter.matchAll(/- "([a-f0-9]+)"/g);
  for (const match of hashMatches) {
    hashes.push(match[1]);
  }

  return hashes;
}
