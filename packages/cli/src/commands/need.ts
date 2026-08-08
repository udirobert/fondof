import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  loadRepoProfiles,
  searchSkills,
  searchSourceMaterial,
  createEmbeddingProvider,
  findTopMatches,
} from "@fondof/core";

export const needCommand = new Command("need")
  .description("Find existing skills and source material for a specific need")
  .argument("<description>", "Describe what you need (natural language)")
  .action(async (description: string) => {
    console.log(chalk.bold("\n  fondof need\n"));
    console.log(chalk.dim(`  "${description}"\n`));

    const repos = loadRepoProfiles();

    // Step 1: Search for existing skills
    const spinner = ora("Searching for existing skills...").start();
    const existingSkills = await searchSkills(description, { numResults: 5 });
    spinner.succeed(
      existingSkills.length > 0
        ? `Found ${existingSkills.length} existing skill${existingSkills.length > 1 ? "s" : ""}`
        : "No exact matches in skill registries"
    );

    if (existingSkills.length > 0) {
      console.log(chalk.dim("\n  Existing skills that may cover this:\n"));
      for (const skill of existingSkills) {
        console.log(`    ${chalk.white(skill.title)}`);
        console.log(chalk.dim(`    ${skill.snippet.slice(0, 100)}`));
        console.log(chalk.dim(`    ${chalk.cyan(skill.url)}\n`));
      }
    }

    // Step 2: Match against user's repos (which ones need this?)
    if (repos.length > 0) {
      const embedder = createEmbeddingProvider();
      const needEmbedding = await embedder.embed(description);

      const reposWithEmbeddings = repos.filter((r) => r.topicEmbedding.length > 0);
      const repoEmbeddings = reposWithEmbeddings.map((r) => r.topicEmbedding);

      if (repoEmbeddings.length > 0) {
        const matches = findTopMatches(needEmbedding, repoEmbeddings, 3, 0.2);

        if (matches.length > 0) {
          console.log(chalk.dim("  Relevant repos:\n"));
          for (const match of matches) {
            const repo = reposWithEmbeddings[match.index];
            console.log(
              `    ${chalk.white(repo.fullName)} ` +
                chalk.dim(`(${Math.round(match.score * 100)}% relevant)`)
            );
          }
          console.log();
        }
      }
    }

    // Step 3: Find source material that could help
    const sourceSpinner = ora("Finding source material...").start();
    const sources = await searchSourceMaterial(description, { numResults: 5 });
    sourceSpinner.succeed(
      sources.length > 0
        ? `Found ${sources.length} relevant source${sources.length > 1 ? "s" : ""}`
        : "No source material found"
    );

    if (sources.length > 0) {
      console.log(chalk.dim("\n  Content that could fill the gap:\n"));
      for (const source of sources) {
        console.log(`    ${chalk.white(source.title)}`);
        console.log(chalk.dim(`    ${source.snippet.slice(0, 100)}`));
        console.log(chalk.dim(`    ${chalk.cyan(source.url)}`));
        console.log();
      }
      console.log(
        chalk.dim(
          `  Ingest a source: ${chalk.white("fondof ingest <url>")}\n`
        )
      );
    }

    // Summary
    if (existingSkills.length === 0 && sources.length > 0) {
      console.log(
        chalk.green("  No existing skill covers this well. Forge something new from the sources above.\n")
      );
    } else if (existingSkills.length > 0) {
      console.log(
        chalk.dim("  Check the existing skills first. If they don't fit your stack, forge your own.\n")
      );
    }
  });
