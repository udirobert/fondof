import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  requestDeviceCode,
  pollForToken,
  listRepos,
  indexRepo,
  getToken,
  saveToken,
  saveRepoProfile,
  loadRepoProfiles,
  type GitHubRepo,
} from "@fondof/core";
import { createLLM } from "../llm.js";

// Default GitHub OAuth App client ID for fondof
// Users can override with FONDOF_GITHUB_CLIENT_ID env var
const GITHUB_CLIENT_ID = process.env.FONDOF_GITHUB_CLIENT_ID ?? "fondof-dev";

export const connectCommand = new Command("connect")
  .description("Connect your GitHub account and index repositories")
  .option("-t, --token <token>", "Use a GitHub personal access token directly")
  .option("--reindex", "Re-index already connected repositories")
  .action(async (options: { token?: string; reindex?: boolean }) => {
    console.log(chalk.bold("\n  fondof connect\n"));

    let token = options.token ?? getToken();

    // Step 1: Authenticate
    if (!token) {
      token = await authenticateWithDeviceFlow();
      if (!token) return;
    } else {
      console.log(chalk.dim("  Using existing GitHub token.\n"));
    }

    // Step 2: List repos
    const spinner = ora("Fetching your repositories...").start();
    let repos: GitHubRepo[];
    try {
      repos = await listRepos(token, { sort: "updated", perPage: 20 });
      spinner.succeed(`Found ${repos.length} repositories`);
    } catch (error) {
      spinner.fail("Failed to fetch repositories");
      console.error(chalk.red(`  ${error}`));
      process.exit(1);
    }

    // Step 3: Display repos for selection
    console.log(chalk.dim("\n  Your most recently updated repositories:\n"));

    const existingProfiles = loadRepoProfiles();
    const indexedNames = new Set(existingProfiles.map((p) => p.fullName));

    for (const [i, repo] of repos.entries()) {
      const indexed = indexedNames.has(repo.fullName);
      const badge = indexed ? chalk.green(" [indexed]") : "";
      const visibility = repo.private ? chalk.dim(" (private)") : "";
      console.log(
        `  ${chalk.dim(`${(i + 1).toString().padStart(2)}.`)} ${chalk.white(repo.fullName)}${visibility}${badge}`
      );
      if (repo.description) {
        console.log(chalk.dim(`      ${repo.description.slice(0, 70)}`));
      }
    }

    console.log(
      chalk.dim(
        `\n  To index a repo, run: ${chalk.white("fondof connect --index <owner/repo>")}\n`
      )
    );
    console.log(
      chalk.dim(
        `  Or set GITHUB_TOKEN env var and run: ${chalk.white("fondof index <owner/repo>")}\n`
      )
    );
  });

// Subcommand to index a specific repo
connectCommand
  .command("index <repo>")
  .description("Index a specific repository (owner/repo)")
  .action(async (repoFullName: string) => {
    const token = getToken();
    if (!token) {
      console.error(chalk.red("\n  Not authenticated. Run `fondof connect` first.\n"));
      process.exit(1);
    }

    const [owner, name] = repoFullName.split("/");
    if (!owner || !name) {
      console.error(chalk.red("\n  Invalid repo format. Use: owner/repo\n"));
      process.exit(1);
    }

    console.log(chalk.bold(`\n  Indexing ${repoFullName}...\n`));

    const llm = createLLM();
    const spinner = ora("Fetching repo metadata...").start();

    try {
      // Get default branch
      const repos = await listRepos(token);
      const repo = repos.find((r) => r.fullName === repoFullName);
      const defaultBranch = repo?.defaultBranch ?? "main";

      spinner.text = "Analyzing languages and dependencies...";
      const profile = await indexRepo({
        owner,
        name,
        token,
        defaultBranch,
        llm,
      });

      spinner.succeed("Repository indexed");

      // Save profile
      saveRepoProfile(profile);

      // Display results
      console.log(chalk.dim(`\n  Languages: ${profile.languages.map((l) => `${l.language} (${l.percentage}%)`).join(", ")}`));
      console.log(chalk.dim(`  Frameworks: ${profile.frameworks.join(", ") || "none detected"}`));
      console.log(chalk.dim(`  Dependencies: ${profile.dependencies.length} total`));
      console.log(chalk.dim(`  Error handling: ${profile.conventions.errorHandling}`));
      console.log(chalk.dim(`  Testing: ${profile.conventions.testing}`));
      console.log(chalk.dim(`  Architecture: ${profile.conventions.architecture}`));
      console.log(chalk.dim(`  Existing skills: ${profile.existingSkills.length > 0 ? profile.existingSkills.join(", ") : "none"}`));
      console.log(chalk.dim(`  Open issue themes: ${profile.openIssueThemes.length}`));
      console.log(chalk.green(`\n  Saved to ~/.fondof/repos.json\n`));
    } catch (error) {
      spinner.fail("Indexing failed");
      if (error instanceof Error) {
        console.error(chalk.red(`\n  ${error.message}\n`));
      }
      process.exit(1);
    }
  });

async function authenticateWithDeviceFlow(): Promise<string | null> {
  console.log(chalk.dim("  Starting GitHub authentication...\n"));

  try {
    const spinner = ora("Requesting device code...").start();
    const deviceCode = await requestDeviceCode(GITHUB_CLIENT_ID);
    spinner.stop();

    console.log(chalk.bold("  To authenticate, visit:"));
    console.log(chalk.cyan(`  ${deviceCode.verificationUri}\n`));
    console.log(chalk.bold("  And enter this code:"));
    console.log(chalk.yellow.bold(`  ${deviceCode.userCode}\n`));

    const pollSpinner = ora("Waiting for authorization...").start();
    const tokenResult = await pollForToken(
      GITHUB_CLIENT_ID,
      deviceCode.deviceCode,
      deviceCode.interval
    );
    pollSpinner.succeed("Authenticated successfully");

    // Save token
    saveToken(tokenResult.accessToken);
    console.log(chalk.green("  Token saved to ~/.fondof/config.json\n"));

    return tokenResult.accessToken;
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n  Authentication failed: ${error.message}\n`));
    }
    return null;
  }
}
