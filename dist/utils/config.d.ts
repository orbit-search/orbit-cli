/**
 * Configuration for the Orbit CLI.
 * Handles API key storage and MCP server environment setup.
 */
declare const CONFIG_DIR: string;
declare const CONFIG_FILE: string;
interface CliConfig {
    apiKey?: string;
    serverPath?: string;
}
export declare function loadConfig(): CliConfig;
/**
 * Get the environment variables to pass to the MCP server subprocess.
 * Loads the chatgpt-app .env for server config, and adds user API key if present.
 */
export declare function getServerEnv(): Record<string, string>;
export declare function getApiKey(): string | undefined;
export declare function getServerPath(): string | undefined;
export { CONFIG_DIR, CONFIG_FILE };
//# sourceMappingURL=config.d.ts.map