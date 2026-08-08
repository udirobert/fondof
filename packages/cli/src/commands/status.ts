import { Command } from "commander";
import chalk from "chalk";
import { loadRepoProfiles, loadSessions, getRecentIdeas } from "@fondof/core";

export const statusCommand = new Command("status")
  .description("Show connected repos, recent ingestions, and forged skills")
  .action(async () => {
    console.log(chalk.bold("\n  fondof status\n"));

    // Repos
    const repos = loadRepoProfiles();
    console.log(chalk.dim("  Connected repos:"));
    if (repos.length === 0) {
      console.log(chalk.yellow("    (none) — run `fondof connect`\n"));
    } else {
      for (const repo of repos) {
        console.log(
          `    ${chalk.white(repo.fullName)} ` +
            chalk.dim(`(${repo.frameworks.join(", ") || repo.languages[0]?.language})`) +
            chalk.dim(` indexed ${new Date(repo.lastIndexed).toLocaleDateString()}`)
        );
      }
      console.log();
    }

    // Sessions
    const sessions = loadSessions();
    console.log(chalk.dim("  Recent ingestions:"));
    if (sessions.length === 0) {
      console.log(chalk.yellow("    (none) — run `fondof ingest <url>`\n"));
    } else {
      for (const session of sessions.slice(-5).reverse()) {
        const label = session.title ?? session.sourceUrl;
        console.log(
          `    ${chalk.white(label.slice(0, 60))} ` +
            chalk.dim(`(${session.ideaIds.length} ideas, ${session.contentType})`) +
            chalk.dim(` ${new Date(session.ingestedAt).toLocaleDateString()}`)
        );
      }
      console.log();
    }

    // Ideas
    const ideas = getRecentIdeas(5);
    console.log(chalk.dim("  Recent ideas:"));
    if (ideas.length === 0) {
      console.log(chalk.yellow("    (none)\n"));
    } else {
      for (const idea of ideas) {
        const typeIcon =
          idea.idea.patternType === "technique" ? "+" :
          idea.idea.patternType === "mental-model" ? "~" :
          idea.idea.patternType === "anti-pattern" ? "!" : "#";
        console.log(
          `    ${chalk.dim(typeIcon)} ${chalk.white(idea.idea.title)} ` +
            chalk.dim(`[${idea.id.slice(0, 8)}]`)
        );
      }
      console.log();
      console.log(chalk.dim(`  Use IDs with: fondof forge --ideas <id1>,<id2>\n`));
    }
  });
