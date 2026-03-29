/**
 * Configuration management for Orbit CLI
 * Supports env vars and config file at ~/.orbit-cli/config.json
 */
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
const CONFIG_DIR = join(homedir(), '.orbit-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
// Default configuration values
const DEFAULT_CONFIG = {
    deepSearchHost: 'https://deep-search.orbitsearch.com',
    socialApiHost: 'https://api.orbitsearch.com',
    socialApiAppVersion: '1.0.0',
};
/**
 * Load configuration from environment variables and/or config file
 * Priority: env vars > config file > defaults
 */
export function loadConfig() {
    const fileConfig = loadConfigFile();
    const envConfig = loadEnvConfig();
    const config = {
        ...DEFAULT_CONFIG,
        ...fileConfig,
        ...envConfig,
    };
    // If user has an API key (from `orbit login`), that's sufficient for auth
    // Internal service keys are only needed if no user API key is present
    if (!config.apiKey) {
        const required = [
            'socialApiAppId',
        ];
        const missing = required.filter((key) => !config[key]);
        if (missing.length > 0) {
            throw new Error(`Not authenticated. Run \`orbit login\` to authenticate,\n` +
                `or set API configuration in ${CONFIG_FILE}`);
        }
    }
    return config;
}
/**
 * Load configuration from config file
 */
function loadConfigFile() {
    if (!existsSync(CONFIG_FILE)) {
        return {};
    }
    try {
        const content = readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        console.warn(`Warning: Failed to parse config file ${CONFIG_FILE}:`, error);
        return {};
    }
}
/**
 * Load configuration from environment variables
 * Maps ORBIT_DEEP_SEARCH_API_KEY -> deepSearchApiKey, etc.
 */
function loadEnvConfig() {
    const envMap = {
        ORBIT_DEEP_SEARCH_API_KEY: 'deepSearchApiKey',
        ORBIT_DEEP_SEARCH_HOST: 'deepSearchHost',
        ORBIT_SOCIAL_API_HOST: 'socialApiHost',
        ORBIT_SOCIAL_API_APP_ID: 'socialApiAppId',
        ORBIT_SOCIAL_API_APP_VERSION: 'socialApiAppVersion',
        ORBIT_SOCIAL_API_KEY: 'socialApiKey',
        ORBIT_SERVICE_USER_ID: 'serviceUserId',
    };
    const config = {};
    for (const [envKey, configKey] of Object.entries(envMap)) {
        const value = process.env[envKey];
        if (value) {
            config[configKey] = value;
        }
    }
    return config;
}
/**
 * Get just the Deep Search API configuration
 */
export function getDeepSearchConfig(config) {
    return {
        deepSearchApiKey: config.deepSearchApiKey,
        deepSearchHost: config.deepSearchHost,
    };
}
/**
 * Get just the Social API configuration
 */
export function getSocialApiConfig(config) {
    return {
        socialApiHost: config.socialApiHost,
        socialApiAppId: config.socialApiAppId,
        socialApiAppVersion: config.socialApiAppVersion,
        socialApiKey: config.socialApiKey,
        serviceUserId: config.serviceUserId,
        userApiKey: config.apiKey,
    };
}
//# sourceMappingURL=config.js.map