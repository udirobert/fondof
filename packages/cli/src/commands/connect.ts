import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";

export const connectCommand = new Command("connect")
  .description("Connect your GitHub account and index repositories")
  .action(async () => {
    const spinner = ora("Connecting to GitHub...").start();

    try {
      // TODO: Implement GitHub OAuth device flow
      // 1. Request device code
      // 2. Prompt user to visit URL and enter code
      // 3. Poll for token
      // 4. Store token securely
      // 5. List repos and let user select
      // 6. Index selected repos

      spinner.stop();
      console.log(chalk.yellow("\n  GitHub connection not yet implemented."));
      console.log(chalk.dim("  Will use OAuth device flow for CLI authentication.\n"));
    } catch (error) {
      spinner.fail("Failed to connect");
      console.error(chalk.red(`  ${error}`));
      process.exit(1);
    }
  });
