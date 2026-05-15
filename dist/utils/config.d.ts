declare const CONFIG_DIR: string;
declare const CONFIG_FILE: string;
export interface OrbitConfig {
    apiHost: string;
    apiKey?: string;
    appId?: string;
    appVersion: string;
    requestingProfileId?: string;
}
export declare function loadConfig(): OrbitConfig;
export declare function getApiKey(): string | undefined;
export { CONFIG_DIR, CONFIG_FILE };
//# sourceMappingURL=config.d.ts.map