import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".orbit-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const DEFAULT_API_HOST = "https://api.orbitsearch.com";
const DEFAULT_APP_VERSION = "1.0.0";

interface CliConfig {
  apiKey?: string;
  orbitApiKey?: string;
  orbitApiHost?: string;
  appId?: string;
  appVersion?: string;
  requestingProfileId?: string;
}

export interface OrbitConfig {
  apiHost: string;
  apiKey?: string;
  appId?: string;
  appVersion: string;
  requestingProfileId?: string;
}

function readFileConfig(): CliConfig {
  if (!existsSync(CONFIG_FILE)) return {};

  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as CliConfig;
  } catch {
    return {};
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveAppVersion(envVersion?: string, fileVersion?: string): string {
  const version = envVersion ?? fileVersion ?? DEFAULT_APP_VERSION;
  return version === "" ? DEFAULT_APP_VERSION : version;
}

export function loadConfig(): OrbitConfig {
  const fileConfig = readFileConfig();
  const apiHost = process.env.ORBIT_API_HOST ?? fileConfig.orbitApiHost ?? DEFAULT_API_HOST;

  return {
    apiHost: stripTrailingSlash(apiHost),
    apiKey: process.env.ORBIT_API_KEY ?? fileConfig.apiKey ?? fileConfig.orbitApiKey,
    appId: process.env.ORBIT_APP_ID ?? fileConfig.appId,
    appVersion: resolveAppVersion(process.env.ORBIT_APP_VERSION, fileConfig.appVersion),
    requestingProfileId: process.env.ORBIT_REQUESTING_PROFILE_ID ?? fileConfig.requestingProfileId,
  };
}

export function getApiKey(): string | undefined {
  return loadConfig().apiKey;
}

export { CONFIG_DIR, CONFIG_FILE };
