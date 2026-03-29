#!/usr/bin/env node
import { Command } from 'commander';
import { searchCommand } from './commands/search.js';
import { profileCommand } from './commands/profile.js';
import { deepSearchCommand } from './commands/deep-search.js';
import { smartSearchCommand } from './commands/smart-search.js';
import { loginCommand } from './commands/login.js';
const program = new Command();
program
    .name('orbit')
    .description('CLI tool for searching people via Orbit APIs')
    .version('1.0.0');
program
    .command('search')
    .description('Search for people by name')
    .argument('<query>', 'Name to search for')
    .option('-l, --limit <n>', 'Number of results to show', '3')
    .option('-j, --json', 'Output raw JSON')
    .option('-v, --verbose', 'Include all fields')
    .option('-a, --age <n>', 'Filter/rank by age')
    .option('--location <state>', 'Filter by location (state)')
    .action(async (query, options) => {
    await searchCommand(query, {
        limit: parseInt(options.limit, 10),
        json: options.json,
        verbose: options.verbose,
        age: options.age ? parseInt(options.age, 10) : undefined,
        location: options.location,
    });
});
program
    .command('profile')
    .description('Get full profile for a specific person')
    .argument('<id>', 'Orbit ID or Sendit ID (UUID)')
    .option('-j, --json', 'Output raw JSON')
    .option('-s, --section <name>', 'Only show specific section (bio, jobs, education, worldview, etc.)')
    .option('-b, --brief', 'One-paragraph summary only')
    .option('--sources', 'Include source URLs')
    .action(async (id, options) => {
    await profileCommand(id, {
        json: options.json,
        section: options.section,
        brief: options.brief,
        sources: options.sources,
    });
});
program
    .command('deep-search')
    .description('Trigger a new deep search for someone not in the system')
    .argument('<name>', 'Full name to search for')
    .option('-p, --phone <number>', 'Phone number (improves accuracy)')
    .option('-t, --twitter <handle>', 'Twitter/X handle')
    .option('-w, --wait', 'Poll until complete (with progress)')
    .action(async (name, options) => {
    await deepSearchCommand(name, {
        phone: options.phone,
        twitter: options.twitter,
        wait: options.wait,
    });
});
program
    .command('smart-search')
    .description('Natural language search via smart search API')
    .argument('<query>', 'Natural language query (e.g., "Stanford engineers who worked at Google")')
    .option('-l, --limit <n>', 'Number of results', '6')
    .option('-j, --json', 'Output raw JSON')
    .action(async (query, options) => {
    await smartSearchCommand(query, {
        limit: parseInt(options.limit, 10),
        json: options.json,
    });
});
program
    .command('login')
    .description('Authenticate with Orbit via browser')
    .option('-k, --key <key>', 'Set API key directly (skip browser flow)')
    .option('--host <url>', 'Orbit web host (default: https://orbitsearch.com)')
    .action(async (options) => {
    await loginCommand({
        key: options.key,
        host: options.host,
    });
});
program
    .command('whoami')
    .description('Show current authentication status')
    .action(async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    const configFile = join(homedir(), '.orbit-cli', 'config.json');
    if (!existsSync(configFile)) {
        console.log('Not authenticated. Run `orbit login` to authenticate.');
        return;
    }
    try {
        const config = JSON.parse(readFileSync(configFile, 'utf-8'));
        if (config.apiKey) {
            console.log(`✓ Authenticated`);
            console.log(`  Key: ${config.apiKey.slice(0, 12)}...`);
        }
        else {
            console.log('No API key configured. Run `orbit login` to authenticate.');
        }
    }
    catch {
        console.log('Config file corrupted. Run `orbit login` to re-authenticate.');
    }
});
program
    .command('logout')
    .description('Remove saved API key')
    .action(async () => {
    const { existsSync, readFileSync, writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    const configFile = join(homedir(), '.orbit-cli', 'config.json');
    if (!existsSync(configFile)) {
        console.log('Not authenticated.');
        return;
    }
    try {
        const config = JSON.parse(readFileSync(configFile, 'utf-8'));
        delete config.apiKey;
        writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
        console.log('✓ Logged out. API key removed.');
    }
    catch {
        console.log('Error clearing config.');
    }
});
program.parse();
//# sourceMappingURL=cli.js.map