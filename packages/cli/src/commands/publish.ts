import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { attest, loadRelayerConfig, queryAttestation } from "@fondof/core";
import type { AttestationRequest } from "@fondof/shared";

export const publishCommand = new Command("publish")
  .description("Publish a forged skill with provenance attestation on Monad")
  .argument("<file>", "Path to the skill markdown file")
  .option("--verify", "Verify an existing attestation instead of publishing")
  .action(async (file: string, options: { verify?: boolean }) => {
    console.log(chalk.bold("\n  fondof publish\n"));

    // Read the skill file
    if (!existsSync(file)) {
      console.error(chalk.red(`  File not found: ${file}\n`));
      process.exit(1);
    }

    const content = readFileSync(file, "utf-8");
    const skillHash = createHash("sha256").update(content).digest("hex");

    console.log(chalk.dim(`  File: ${file}`));
    console.log(chalk.dim(`  Skill hash: ${skillHash.slice(0, 16)}...\n`));

    // Extract source hashes from frontmatter
    const sourceHashes = extractSourceHashes(content);
    if (sourceHashes.length === 0) {
      console.error(
        chalk.red("  No provenance data found in skill frontmatter.\n") +
          chalk.dim("  Skills must be forged with `fondof forge` to include provenance.\n")
      );
      process.exit(1);
    }

    console.log(chalk.dim(`  Sources: ${sourceHashes.length} content hash(es)`));

    // Load relayer config
    let config;
    try {
      config = loadRelayerConfig();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`\n  ${error.message}\n`));
      }
      console.error(
        chalk.dim(
          "  Set FONDOF_RELAYER_KEY and FONDOF_CONTRACT_ADDRESS environment variables.\n"
        )
      );
      process.exit(1);
    }

    if (options.verify) {
      // Verify existing attestation
      const spinner = ora("Querying Monad for attestation...").start();
      try {
        const attestation = await queryAttestation(skillHash, config);
        if (attestation) {
          spinner.succeed("Attestation found on-chain");
          console.log(chalk.dim(`\n  Creator: ${attestation.creator}`));
          console.log(chalk.dim(`  Timestamp: ${new Date(attestation.timestamp * 1000).toISOString()}`));
          console.log(chalk.dim(`  Overlap score: ${attestation.overlapScore / 100}%`));
          console.log(chalk.dim(`  Benchmark score: ${attestation.benchmarkScore / 100}%\n`));
          console.log(chalk.green("  ✓ This skill's provenance is verified on Monad.\n"));
        } else {
          spinner.info("No attestation found for this skill");
          console.log(chalk.dim(`\n  Publish it with: fondof publish ${file}\n`));
        }
      } catch (error) {
        spinner.fail("Query failed");
        if (error instanceof Error) {
          console.error(chalk.red(`  ${error.message}\n`));
        }
      }
      return;
    }

    // Publish attestation
    const request: AttestationRequest = {
      skillHash,
      sourceHashes,
      overlapScore: 0, // TODO: populate from discovery results
      benchmarkScore: 0, // TODO: populate from validation results
    };

    const spinner = ora("Attesting on Monad (this takes ~600ms)...").start();
    try {
      const receipt = await attest(request, config);
      spinner.succeed("Skill attested on Monad");

      console.log(chalk.dim(`\n  Transaction: ${receipt.txHash}`));
      console.log(chalk.dim(`  Block: ${receipt.blockNumber}`));
      console.log(chalk.green("\n  ✓ Provenance recorded. Anyone can verify this skill's lineage.\n"));
      console.log(
        chalk.dim(`  Verify: ${chalk.white(`fondof publish --verify ${file}`)}\n`)
      );
    } catch (error) {
      spinner.fail("Attestation failed");
      if (error instanceof Error) {
        console.error(chalk.red(`\n  ${error.message}\n`));
      }
      process.exit(1);
    }
  });

/**
 * Extract source hashes from skill frontmatter.
 */
function extractSourceHashes(content: string): string[] {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];

  const frontmatter = frontmatterMatch[1];
  const hashes: string[] = [];

  // Match sourceHashes array entries
  const hashMatches = frontmatter.matchAll(/- "([a-f0-9]+)"/g);
  for (const match of hashMatches) {
    hashes.push(match[1]);
  }

  return hashes;
}
