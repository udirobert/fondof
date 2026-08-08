import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { challengeSkill, getSkillOnChain, loadPoolConfig } from "@fondof/core";

export const challengeCommand = new Command("challenge")
  .description("Challenge a skill's quality by staking against it")
  .argument("<skill-hash>", "Hash of the skill to challenge")
  .option("-s, --stake <amount>", "Stake amount in MON (default: 0.001)", "0.001")
  .action(async (skillHash: string, options: { stake: string }) => {
    console.log(chalk.bold("\n  fondof challenge\n"));
    console.log(chalk.dim(`  Skill: ${skillHash.slice(0, 16)}...`));
    console.log(chalk.dim(`  Stake: ${options.stake} MON\n`));

    let config;
    try {
      config = loadPoolConfig();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`  ${error.message}\n`));
      }
      process.exit(1);
    }

    // Check the skill exists
    const infoSpinner = ora("Checking skill...").start();
    const skill = await getSkillOnChain(skillHash, config);
    if (!skill) {
      infoSpinner.fail("Skill not found in pool");
      process.exit(1);
    }
    infoSpinner.succeed("Skill found");

    console.log(chalk.dim(`  Current signal: ${skill.signal}`));
    console.log(chalk.dim(`  Usage count: ${skill.usageCount}`));
    console.log(chalk.dim(`  Forger: ${skill.forger}\n`));

    // Submit challenge
    const spinner = ora("Submitting challenge to SkillPool...").start();
    try {
      const receipt = await challengeSkill(skillHash, config, options.stake);
      spinner.succeed("Challenge submitted");

      console.log(chalk.dim(`\n  Transaction: ${receipt.txHash}`));
      console.log(chalk.dim(`  Challenge ID: ${receipt.challengeId}`));
      console.log(
        chalk.yellow(
          "\n  Challenge is now pending resolution."
        )
      );
      console.log(
        chalk.dim(
          "  The resolver will benchmark both skills and settle the challenge."
        )
      );
      console.log(
        chalk.dim(
          "  If you win: you get your stake back + a portion of the skill's backing."
        )
      );
      console.log(
        chalk.dim(
          "  If you lose: your stake goes to the skill's backing (making it stronger).\n"
        )
      );
    } catch (error) {
      spinner.fail("Challenge failed");
      if (error instanceof Error) {
        console.error(chalk.red(`\n  ${error.message}\n`));
      }
      process.exit(1);
    }
  });
