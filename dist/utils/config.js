/**
 * Configuration for the Orbit CLI.
 * Handles API key storage and MCP server environment setup.
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const CONFIG_DIR = join(homedir(), ".orbit-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
export function loadConfig() {
    if (!existsSync(CONFIG_FILE))
        return {};
    try {
        return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    }
    catch {
        return {};
    }
}
/**
 * Get the environment variables to pass to the MCP server subprocess.
 * Loads the chatgpt-app .env for server config, and adds user API key if present.
 */
export function getServerEnv() {
    const config = loadConfig();
    const env = {};
    // Load the chatgpt-app .env if it exists
    const serverDir = join(process.env.HOME || homedir(), "Projects/work/orbit/orbit-chatgpt-app");
    const envFile = join(serverDir, ".env");
    if (existsSync(envFile)) {
        const lines = readFileSync(envFile, "utf-8").split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#"))
                continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx > 0) {
                env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
            }
        }
    }
    // Override with user API key if configured
    if (config.apiKey) {
        env.ORBIT_API_KEY = config.apiKey;
    }
    return env;
}
export function getApiKey() {
    return loadConfig().apiKey;
}
export function getServerPath() {
    return loadConfig().serverPath;
}
export { CONFIG_DIR, CONFIG_FILE };
//# sourceMappingURL=config.js.map