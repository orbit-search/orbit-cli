import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { exec as execCb } from "node:child_process";
import { createInterface } from "node:readline";

const CONFIG_DIR = join(homedir(), ".orbit-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const DEFAULT_HOST = "https://orbitsearch.com";
const CALLBACK_TIMEOUT_MS = 300_000; // 5 minutes

export interface LoginOptions {
  key?: string;
  host?: string;
}

function saveApiKey(apiKey: string): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  let config: Record<string, unknown> = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    } catch {
      // Start fresh
    }
  }

  config.apiKey = apiKey;
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

function findOpenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (addr && typeof addr === "object") {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("Could not find open port")));
      }
    });
    srv.on("error", reject);
  });
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function loginWithKey(): Promise<void> {
  const key = await prompt("\n  Paste your API key: ");

  if (!key) {
    console.error("\n  ✗ No key provided.");
    process.exit(1);
  }

  if (!key.startsWith("sk_orb_")) {
    console.error("\n  ✗ Invalid key format. Orbit API keys start with sk_orb_");
    process.exit(1);
  }

  saveApiKey(key);
  console.log("\n  ✓ API key saved.");
  console.log(`  Key: ${key.slice(0, 12)}...`);
  console.log("\n  You can now use `orbit search` and other commands.\n");
}

async function loginWithBrowser(host: string): Promise<void> {
  console.log("\n  Opening browser for authentication...\n");

  const port = await findOpenPort();
  const state = randomBytes(16).toString("hex");

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

      if (!key || !returnedState) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Missing key or state");
        return;
      }

      if (returnedState !== state) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("State mismatch");
        return;
      }

      if (!key.startsWith("sk_orb_")) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid key format");
        return;
      }

      callbackReceived = true;
      saveApiKey(key);

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");

      console.log("  ✓ Authentication successful!");
      console.log(`  API key saved to ~/.orbit-cli/config.json`);
      console.log(`  Key: ${key.slice(0, 12)}...`);
      console.log("\n  You can now use `orbit search` and other commands.\n");

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 500);
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  server.listen(port, "127.0.0.1", () => {
    const authUrl = `${host}/settings/cli-auth?port=${port}&state=${encodeURIComponent(state)}`;

    console.log(`  If the browser doesn't open, visit:\n`);
    console.log(`  ${authUrl}\n`);
    console.log(`  Waiting for authentication...`);

    const platform = process.platform;
    const cmd =
      platform === "darwin" ? "open" :
      platform === "win32" ? "start" :
      "xdg-open";

    execCb(`${cmd} "${authUrl}"`, () => {});
  });

  setTimeout(() => {
    if (!callbackReceived) {
      console.error("\n  ✗ Authentication timed out after 5 minutes.");
      console.error("  Run `orbit login` to try again.\n");
      server.close();
      process.exit(1);
    }
  }, CALLBACK_TIMEOUT_MS);
}

export async function loginCommand(options: LoginOptions): Promise<void> {
  // Non-interactive: direct key input via flag
  if (options.key) {
    if (!options.key.startsWith("sk_orb_")) {
      console.error("Error: Invalid API key format. Keys should start with sk_orb_");
      process.exit(1);
    }
    saveApiKey(options.key);
    console.log("✓ API key saved to ~/.orbit-cli/config.json");
    return;
  }

  const host = options.host || DEFAULT_HOST;

  console.log("\n  🔐 Orbit Authentication\n");
  console.log("  How would you like to authenticate?\n");
  console.log("  1. Login with browser (recommended)");
  console.log("  2. Paste an API key\n");

  const choice = await prompt("  Choose (1 or 2): ");

  if (choice === "2" || choice.toLowerCase() === "key" || choice.toLowerCase() === "paste") {
    await loginWithKey();
  } else {
    await loginWithBrowser(host);
  }
}
