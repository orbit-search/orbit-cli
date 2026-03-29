/**
 * Configuration management for Orbit CLI
 * Supports env vars and config file at ~/.orbit-cli/config.json
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AppConfig } from '../api/types.js';

const CONFIG_DIR = join(homedir(), '.orbit-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// Default configuration values
const DEFAULT_CONFIG: Partial<AppConfig> = {
  deepSearchHost: 'https://deep-search.orbitsearch.com',
  socialApiHost: 'https://api.orbitsearch.com',
  socialApiAppVersion: '1.0.0',
};

/**
 * Load configuration from environment variables and/or config file
 * Priority: env vars > config file > defaults
 */
export function loadConfig(): AppConfig {
  const fileConfig = loadConfigFile();
  const envConfig = loadEnvConfig();

  const config: AppConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
  } as AppConfig;

  // Validate required fields
  const required: Array<keyof AppConfig> = [
    'deepSearchApiKey',
    'socialApiAppId',
    'socialApiKey',
    'serviceUserId',
  ];

  const missing = required.filter((key) => !config[key as keyof AppConfig]);
  if (missing.length > 0) {
    const envVars = missing.map((k) => {
      const envKey = k.replace(/([A-Z])/g, '_$1').toUpperCase();
      return `ORBIT_${envKey}`;
    });
    throw new Error(
      `Missing required configuration: ${missing.join(', ')}\n` +
        `Set via environment variables (${envVars.join(', ')}) ` +
        `or in ${CONFIG_FILE}`
    );
  }

  return config;
}

/**
 * Load configuration from config file
 */
function loadConfigFile(): Partial<AppConfig> {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content) as Partial<AppConfig>;
  } catch (error) {
    console.warn(`Warning: Failed to parse config file ${CONFIG_FILE}:`, error);
    return {};
  }
}

/**
 * Load configuration from environment variables
 * Maps ORBIT_DEEP_SEARCH_API_KEY -> deepSearchApiKey, etc.
 */
function loadEnvConfig(): Partial<AppConfig> {
  const envMap: Record<string, keyof AppConfig> = {
    ORBIT_DEEP_SEARCH_API_KEY: 'deepSearchApiKey',
    ORBIT_DEEP_SEARCH_HOST: 'deepSearchHost',
    ORBIT_SOCIAL_API_HOST: 'socialApiHost',
    ORBIT_SOCIAL_API_APP_ID: 'socialApiAppId',
    ORBIT_SOCIAL_API_APP_VERSION: 'socialApiAppVersion',
    ORBIT_SOCIAL_API_KEY: 'socialApiKey',
    ORBIT_SERVICE_USER_ID: 'serviceUserId',
  };

  const config: Partial<AppConfig> = {};

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
export function getDeepSearchConfig(config: AppConfig): {
  deepSearchApiKey: string;
  deepSearchHost: string;
} {
  return {
    deepSearchApiKey: config.deepSearchApiKey,
    deepSearchHost: config.deepSearchHost,
  };
}

/**
 * Get just the Social API configuration
 */
export function getSocialApiConfig(config: AppConfig): {
  socialApiHost: string;
  socialApiAppId: string;
  socialApiAppVersion: string;
  socialApiKey: string;
  serviceUserId: string;
} {
  return {
    socialApiHost: config.socialApiHost,
    socialApiAppId: config.socialApiAppId,
    socialApiAppVersion: config.socialApiAppVersion,
    socialApiKey: config.socialApiKey,
    serviceUserId: config.serviceUserId,
  };
}
