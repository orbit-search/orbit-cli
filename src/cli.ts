#!/usr/bin/env node
import { Command } from "commander";
import { searchCommand } from "./commands/search.js";
import { profileCommand } from "./commands/profile.js";
import { meCommand } from "./commands/me.js";
import { loginCommand } from "./commands/login.js";
import { loadConfig } from "./utils/config.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const program = new Command();

program
  .name("orbit")
  .description("Orbit CLI — search people from the command line")
  .version("2.0.0");

program
  .command("search")
  .description("Search for people by name or natural language query")
  .argument("<query>", "Search query")
  .option("-j, --json", "Output structured JSON")
  .option("-n, --limit <n>", "Max results", "6")
  .option("-1, --first", "Show only the first result")
  .action(async (query: string, options: { json?: boolean; limit?: string; first?: boolean }) => {
    await searchCommand(query, {
      json: options.json,
      limit: options.first ? 1 : Number(options.limit) || 6,
    });
  });

program
  .command("profile")
  .description("Get detailed profile for a person by user ID")
  .argument("<userId>", "User ID (UUID)")
  .option("-j, --json", "Output structured JSON")
  .option("-b, --brief", "Short summary (name, bio, work, social)")
  .action(async (userId: string, options: { json?: boolean; brief?: boolean }) => {
    await profileCommand(userId, { json: options.json, brief: options.brief });
  });

program
  .command("me")
  .description("Get your own profile (requires authentication)")
  .option("-j, --json", "Output structured JSON")
  .option("-b, --brief", "Short summary")
  .action(async (options: { json?: boolean; brief?: boolean }) => {
    await meCommand({ json: options.json, brief: options.brief });
  });

program
  .command("login")
  .description("Authenticate with Orbit via browser")
  .option("-k, --key <key>", "Set API key directly (skip browser flow)")
  .option("--host <url>", "Orbit web host (default: https://orbitsearch.com)")
  .action(async (options: { key?: string; host?: string }) => {
    await loginCommand({ key: options.key, host: options.host });
  });

program
  .command("whoami")
  .description("Show current authentication status")
  .action(() => {
    const config = loadConfig();
    if (config.apiKey) {
      console.log(`✓ Authenticated`);
      console.log(`  Key: ${config.apiKey.slice(0, 12)}...`);
    } else {
      console.log("Not authenticated. Run `orbit login` to authenticate.");
      console.log("Anonymous mode: search still works via service keys.");
    }
  });

program
  .command("logout")
  .description("Remove saved API key")
  .action(() => {
    const configFile = join(homedir(), ".orbit-cli", "config.json");
    if (!existsSync(configFile)) {
      console.log("Not authenticated.");
      return;
    }
    try {
      const config = JSON.parse(readFileSync(configFile, "utf-8"));
      delete config.apiKey;
      writeFileSync(configFile, JSON.stringify(config, null, 2) + "\n");
      console.log("✓ Logged out. API key removed.");
    } catch {
      console.log("Error clearing config.");
    }
  });

program.parse();
