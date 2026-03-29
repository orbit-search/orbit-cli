/**
 * Configuration management for Orbit CLI
 * Supports env vars and config file at ~/.orbit-cli/config.json
 */
import type { AppConfig } from '../api/types.js';
/**
 * Load configuration from environment variables and/or config file
 * Priority: env vars > config file > defaults
 */
export declare function loadConfig(): AppConfig;
/**
 * Get just the Deep Search API configuration
 */
export declare function getDeepSearchConfig(config: AppConfig): {
    deepSearchApiKey: string;
    deepSearchHost: string;
};
/**
 * Get just the Social API configuration
 */
export declare function getSocialApiConfig(config: AppConfig): {
    socialApiHost: string;
    socialApiAppId: string;
    socialApiAppVersion: string;
    socialApiKey: string;
    serviceUserId: string;
};
//# sourceMappingURL=config.d.ts.map