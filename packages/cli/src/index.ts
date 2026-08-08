#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "node:path";
import { Command } from "commander";

// Load .env from project root (walk up from packages/cli)
config({ path: resolve(process.cwd(), ".env"), override: false, debug: false });
config({ path: resolve(process.cwd(), "../../.env"), override: false, debug: false }); // from packages/cli

import { connectCommand } from "./commands/connect.js";
import { ingestCommand } from "./commands/ingest.js";
import { needCommand } from "./commands/need.js";
import { forgeCommand } from "./commands/forge.js";
import { publishCommand } from "./commands/publish.js";
import { challengeCommand } from "./commands/challenge.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("fondof")
  .description("The bridge between what you learn and what your agents do")
  .version("0.1.0");

program.addCommand(connectCommand);
program.addCommand(ingestCommand);
program.addCommand(needCommand);
program.addCommand(forgeCommand);
program.addCommand(publishCommand);
program.addCommand(challengeCommand);
program.addCommand(statusCommand);

program.parse();
