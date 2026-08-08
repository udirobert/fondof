import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ingest } from "@fondof/core";
import { createClaudeLLM } from "../llm.js";

export const ingestCommand = new Command("ingest")
  .description("Ingest content from a podcast or blog URL")
  .argument("<url>", "URL of the content to ingest")
  .option("-l, --language <code>", "Language hint for transcription (ISO 639-3)", "eng")
  .option("-k, --keyterms <terms>", "Comma-separated domain keyterms for transcription")
  .action(async (url: string, options: { language: string; keyterms?: string }) => {
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
      console.log(chalk.dim(`  Text length: ${result.rawText.length.toLocaleString()} chars\n`));

      // Display extracted ideas
      if (result.ideas.length === 0) {
        console.log(chalk.yellow("  No actionable ideas extracted.\n"));
        return;
      }

      console.log(chalk.bold(`  ${result.ideas.length} ideas extracted:\n`));

      for (const [i, idea] of result.ideas.entries()) {
        const worthBadge = chalk.green("●");
        console.log(`  ${worthBadge} ${chalk.bold(`${i + 1}. ${idea.idea.title}`)}`);
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

      console.log(
        chalk.dim(`  Run ${chalk.white("fondof forge")} to compose a skill from these ideas.\n`)
      );
    } catch (error) {
      spinner.fail("Ingestion failed");
      if (error instanceof Error) {
        console.error(chalk.red(`\n  ${error.message}\n`));
      } else {
        console.error(chalk.red(`\n  ${error}\n`));
      }
      process.exit(1);
    }
  });
