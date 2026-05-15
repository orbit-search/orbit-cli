import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const CONFIG_DIR = join(homedir(), ".orbit-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const DEFAULT_API_HOST = "https://api.orbitsearch.com";
const DEFAULT_APP_VERSION = "1.0.0";
function readFileConfig() {
    if (!existsSync(CONFIG_FILE))
        return {};
    try {
        return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    }
    catch {
        return {};
    }
}
function stripTrailingSlash(value) {
    return value.replace(/\/+$/, "");
}
export function loadConfig() {
    const fileConfig = readFileConfig();
    const apiHost = process.env.ORBIT_API_HOST ?? fileConfig.orbitApiHost ?? DEFAULT_API_HOST;
    return {
        apiHost: stripTrailingSlash(apiHost),
        apiKey: process.env.ORBIT_API_KEY ?? fileConfig.apiKey ?? fileConfig.orbitApiKey,
        appId: process.env.ORBIT_APP_ID ?? fileConfig.appId,
        appVersion: process.env.ORBIT_APP_VERSION || fileConfig.appVersion || DEFAULT_APP_VERSION,
        requestingProfileId: process.env.ORBIT_REQUESTING_PROFILE_ID ?? fileConfig.requestingProfileId,
    };
}
export function getApiKey() {
    return loadConfig().apiKey;
}
export { CONFIG_DIR, CONFIG_FILE };
//# sourceMappingURL=config.js.map