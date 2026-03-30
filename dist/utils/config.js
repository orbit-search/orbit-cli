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
export function getApiKey() {
    return loadConfig().apiKey;
}
export { CONFIG_DIR, CONFIG_FILE };
//# sourceMappingURL=config.js.map