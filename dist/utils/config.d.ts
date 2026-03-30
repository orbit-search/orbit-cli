declare const CONFIG_DIR: string;
declare const CONFIG_FILE: string;
interface CliConfig {
    apiKey?: string;
}
export declare function loadConfig(): CliConfig;
export declare function getApiKey(): string | undefined;
export { CONFIG_DIR, CONFIG_FILE };
//# sourceMappingURL=config.d.ts.map