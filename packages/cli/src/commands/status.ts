import { Command } from "commander";
import chalk from "chalk";

export const statusCommand = new Command("status")
  .description("Show connected repos, recent ingestions, and forged skills")
  .action(async () => {
    console.log(chalk.bold("\n  fondof status\n"));

    // TODO: Load from local store
    console.log(chalk.dim("  Connected repos:"));
    console.log(chalk.yellow("    (none connected yet — run `fondof connect`)\n"));

    console.log(chalk.dim("  Recent ingestions:"));
    console.log(chalk.yellow("    (none yet — run `fondof ingest <url>`)\n"));

    console.log(chalk.dim("  Forged skills:"));
    console.log(chalk.yellow("    (none yet — run `fondof forge`)\n"));
  });
