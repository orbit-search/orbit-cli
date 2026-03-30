import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { exec as execCb } from "node:child_process";
import * as p from "@clack/prompts";
const CONFIG_DIR = join(homedir(), ".orbit-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const DEFAULT_HOST = "https://orbitsearch.com";
const CALLBACK_TIMEOUT_MS = 300_000;
function saveApiKey(apiKey) {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }
    let config = {};
    if (existsSync(CONFIG_FILE)) {
        try {
            config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
        }
        catch {
            // Start fresh
        }
    }
    config.apiKey = apiKey;
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}
function findOpenPort() {
    return new Promise((resolve, reject) => {
        const srv = createServer();
        srv.listen(0, "127.0.0.1", () => {
            const addr = srv.address();
            if (addr && typeof addr === "object") {
                const port = addr.port;
                srv.close(() => resolve(port));
            }
            else {
                srv.close(() => reject(new Error("Could not find open port")));
            }
        });
        srv.on("error", reject);
    });
}
async function loginWithKey() {
    const key = await p.text({
        message: "Paste your API key",
        placeholder: "sk_orb_...",
        validate(value) {
            if (!value)
                return "API key is required";
            if (!value.startsWith("sk_orb_"))
                return "Invalid format — Orbit API keys start with sk_orb_";
        },
    });
    if (p.isCancel(key)) {
        p.cancel("Login cancelled.");
        process.exit(0);
    }
    saveApiKey(key);
    p.outro(`Authenticated — ${key.slice(0, 12)}...`);
}
async function loginWithBrowser(host) {
    const port = await findOpenPort();
    const state = randomBytes(16).toString("hex");
    const authUrl = `${host}/settings/cli-auth?port=${port}&state=${encodeURIComponent(state)}`;
    let callbackReceived = false;
    const server = createServer((req, res) => {
        const url = new URL(req.url || "/", `http://localhost:${port}`);
        if (url.pathname === "/callback") {
            const key = url.searchParams.get("key");
            const returnedState = url.searchParams.get("state");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "*");
            if (req.method === "OPTIONS") {
                res.writeHead(204);
                res.end();
                return;
            }
            if (!key || returnedState !== state || !key.startsWith("sk_orb_")) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                res.end("Invalid callback");
                return;
            }
            callbackReceived = true;
            saveApiKey(key);
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("OK");
            spinner.stop(`Authenticated — ${key.slice(0, 12)}...`);
            p.note(`Key saved to ~/.orbit-cli/config.json\nRun \`orbit search\` to get started.`, "Ready");
            setTimeout(() => {
                server.close();
                process.exit(0);
            }, 300);
        }
        else {
            res.writeHead(404);
            res.end();
        }
    });
    const spinner = p.spinner();
    server.listen(port, "127.0.0.1", () => {
        p.note(authUrl, "If the browser doesn't open, visit");
        spinner.start("Waiting for browser authentication...");
        const platform = process.platform;
        const cmd = platform === "darwin" ? "open" :
            platform === "win32" ? "start" :
                "xdg-open";
        execCb(`${cmd} "${authUrl}"`, () => { });
    });
    setTimeout(() => {
        if (!callbackReceived) {
            spinner.stop("Authentication timed out.");
            p.cancel("Run `orbit login` to try again.");
            server.close();
            process.exit(1);
        }
    }, CALLBACK_TIMEOUT_MS);
}
export async function loginCommand(options) {
    // Non-interactive: direct key input via flag
    if (options.key) {
        if (!options.key.startsWith("sk_orb_")) {
            p.cancel("Invalid API key format. Keys should start with sk_orb_");
            process.exit(1);
        }
        saveApiKey(options.key);
        p.outro(`Authenticated — ${options.key.slice(0, 12)}...`);
        return;
    }
    const host = options.host || DEFAULT_HOST;
    p.intro("🔐 Orbit");
    const method = await p.select({
        message: "How would you like to authenticate?",
        options: [
            { value: "browser", label: "Login with browser", hint: "recommended" },
            { value: "key", label: "Paste an API key" },
        ],
    });
    if (p.isCancel(method)) {
        p.cancel("Login cancelled.");
        process.exit(0);
    }
    if (method === "key") {
        await loginWithKey();
    }
    else {
        await loginWithBrowser(host);
    }
}
//# sourceMappingURL=login.js.map