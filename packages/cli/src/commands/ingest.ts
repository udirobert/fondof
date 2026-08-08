import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ingest, discover, loadRepoProfiles } from "@fondof/core";
import { createClaudeLLM } from "../llm.js";

export const ingestCommand = new Command("ingest")
  .description("Ingest content from a podcast or blog URL")
  .argument("<url>", "URL of the content to ingest")
  .option("-l, --language <code>", "Language hint for transcription (ISO 639-3)", "eng")
  .option("-k, --keyterms <terms>", "Comma-separated domain keyterms for transcription")
  .option("--skip-discovery", "Skip repo matching (faster, no LLM worthiness calls)")
  .action(
    async (
      url: string,
      options: { language: string; keyterms?: string; skipDiscovery?: boolean }
    ) => {
      console.log(chalk.bold("\n  fondof ingest\n"));
      console.log(chalk.dim(`  Source: ${url}\n`));

      const llm = createClaudeLLM();
      const keyterms = options.keyterms?.split(",").map((t) => t.trim());

      const spinner = ora("Resolving content type...").start();

      try {
        const result = await ingest({
          url,
          llm,
          languageCode: options.language,
          keyterms,
        });

        spinner.succeed(`Content type: ${result.contentType}`);

        if (result.title) {
          console.log(chalk.dim(`  Title: ${result.title}`));
        }
        if (result.author) {
          console.log(chalk.dim(`  Author: ${result.author}`));
        }
        console.log(chalk.dim(`  Source hash: ${result.sourceHash.slice(0, 12)}...`));
        console.log(
          chalk.dim(`  Text length: ${result.rawText.length.toLocaleString()} chars\n`)
        );

        if (result.ideas.length === 0) {
          console.log(chalk.yellow("  No actionable ideas extracted.\n"));
          return;
        }

        console.log(chalk.bold(`  ${result.ideas.length} ideas extracted:\n`));

        // Run discovery if repos are connected
        const repos = loadRepoProfiles();
        if (repos.length > 0 && !options.skipDiscovery) {
          const discoverSpinner = ora("Matching ideas to your repos...").start();
          const discoveryResults = await discover({
            ideas: result.ideas,
            repos,
            llm,
            skipLlmWorthiness: false,
          });
          discoverSpinner.succeed("Discovery complete\n");

          for (const [i, dr] of discoveryResults.entries()) {
            const worthIcon =
              dr.skillWorthiness.recommendation === "forge-skill"
                ? chalk.green("◆")
                : dr.skillWorthiness.recommendation === "apply-directly"
                  ? chalk.yellow("◇")
                  : chalk.dim("○");

            const worthLabel =
              dr.skillWorthiness.recommendation === "forge-skill"
                ? chalk.green("FORGE")
                : dr.skillWorthiness.recommendation === "apply-directly"
                  ? chalk.yellow("APPLY")
                  : chalk.dim("SKIP");

            console.log(
              `  ${worthIcon} ${chalk.bold(`${i + 1}. ${dr.idea.idea.title}`)} ${worthLabel}`
            );
            console.log(chalk.dim(`     ${dr.idea.idea.description.slice(0, 100)}...`));
            console.log(
              chalk.dim(`     Type: ${dr.idea.idea.patternType}  |  `) +
                chalk.cyan(dr.idea.idea.domain.join(", "))
            );

            // Show repo matches
            if (dr.matchedRepos.length > 0) {
              const topMatch = dr.matchedRepos[0];
              console.log(
                chalk.dim("     Matches: ") +
                  chalk.white(topMatch.repo.fullName) +
                  chalk.dim(` (${Math.round(topMatch.relevanceScore * 100)}%)`) +
                  (dr.matchedRepos.length > 1
                    ? chalk.dim(` +${dr.matchedRepos.length - 1} more`)
                    : "")
              );
              console.log(chalk.dim(`     Reason: ${topMatch.rationale}`));
            } else {
              console.log(chalk.dim("     Matches: no repo match"));
            }

            // Show existing skill overlap
            if (dr.existingSkills.length > 0) {
              const topSkill = dr.existingSkills[0];
              console.log(
                chalk.dim("     Existing: ") +
                  chalk.red(`"${topSkill.name}"`) +
                  chalk.dim(
                    ` (${Math.round(topSkill.overlapScore * 100)}% overlap)`
                  )
              );
            }

            // Show worthiness reasoning
            console.log(chalk.dim(`     ${dr.skillWorthiness.reasoning}`));
            console.log();
          }

          const forgeCount = discoveryResults.filter(
            (r) => r.skillWorthiness.recommendation === "forge-skill"
          ).length;
          if (forgeCount > 0) {
            console.log(
              chalk.green(`  ${forgeCount} idea${forgeCount > 1 ? "s" : ""} worth forging.`) +
                chalk.dim(` Run ${chalk.white("fondof forge")} to compose skills.\n`)
            );
          }
        } else {
          // No repos connected — just show ideas without discovery
          for (const [i, idea] of result.ideas.entries()) {
            console.log(`  ${chalk.green("●")} ${chalk.bold(`${i + 1}. ${idea.idea.title}`)}`);
            console.log(chalk.dim(`     ${idea.idea.description.slice(0, 120)}...`));
            console.log(
              chalk.dim(`     Type: ${idea.idea.patternType}  |  `) +
                chalk.cyan(idea.idea.domain.join(", "))
            );
            console.log(
              chalk.dim(`     Applies to: ${idea.idea.applicability.join(", ")}`)
            );
            console.log();
          }

          if (repos.length === 0) {
            console.log(
              chalk.dim(
                `  Connect repos for smarter matching: ${chalk.white("fondof connect")}\n`
              )
            );
          }
        }
      } catch (error) {
        spinner.fail("Ingestion failed");
        if (error instanceof Error) {
          console.error(chalk.red(`\n  ${error.message}\n`));
        } else {
          console.error(chalk.red(`\n  ${error}\n`));
        }
        process.exit(1);
      }
    }
  );
