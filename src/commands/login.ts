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

export interface LoginOptions {
  key?: string;
  host?: string;
  appId?: string;
  appVersion?: string;
  clearAppId?: boolean;
}

interface SaveApiKeyResult {
  savedAppId: boolean;
  savedAppVersion: boolean;
  keptExistingAppId: boolean;
  missingAppId: boolean;
  clearedRequesterProfileId: boolean;
  clearedAppMetadata: boolean;
}

function saveApiKey(apiKey: string, appId?: string, appVersion?: string, clearAppId = false): SaveApiKeyResult {
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

  const hadRequesterProfileId = Boolean(config.requestingProfileId);
  const hadAppMetadata = Boolean(config.appId || config.appVersion || config.requestingProfileId);
  config.apiKey = apiKey;
  delete config.orbitApiKey;
  if (appId) {
    config.appId = appId;
    if (appVersion) {
      config.appVersion = appVersion;
    }
    delete config.requestingProfileId;
  } else if (clearAppId) {
    delete config.appId;
    delete config.appVersion;
    delete config.requestingProfileId;
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");

  return {
    savedAppId: Boolean(appId),
    savedAppVersion: Boolean(appId && appVersion),
    keptExistingAppId: !appId && !clearAppId && Boolean(config.appId),
    missingAppId: !appId && !clearAppId && !config.appId && !process.env.ORBIT_APP_ID,
    clearedRequesterProfileId: (Boolean(appId) || clearAppId) && hadRequesterProfileId,
    clearedAppMetadata: clearAppId && hadAppMetadata,
  };
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

function appMetadataNote(result: SaveApiKeyResult): string | null {
  if (result.savedAppId) {
    const requesterNote = result.clearedRequesterProfileId ? " Saved requester profile config was cleared." : "";
    const versionNote = result.savedAppVersion ? " App version was saved." : "";
    return `App metadata was saved with this key.${versionNote}${requesterNote}`;
  }
  if (result.keptExistingAppId) {
    return "Existing app metadata was kept. Pass --app-id to replace it or --clear-app-id to remove it.";
  }
  if (result.clearedAppMetadata) {
    return "Saved app metadata was removed.";
  }
  if (result.missingAppId) {
    return "No app metadata is configured. If your API access includes an app ID, pass --app-id or set ORBIT_APP_ID.";
  }
  return null;
}

function showSavedKey(apiKey: string, result: SaveApiKeyResult): void {
  const note = appMetadataNote(result);
  if (note) p.note(note, "App metadata");
  p.outro(`Authenticated — ${apiKey.slice(0, 12)}...`);
}

async function loginWithKey(appId?: string, appVersion?: string, clearAppId = false): Promise<void> {
  const key = await p.text({
    message: "Paste your API key",
    placeholder: "sk_orb_...",
    validate(value) {
      if (!value) return "API key is required";
      if (!value.startsWith("sk_orb_")) return "Invalid format — Orbit API keys start with sk_orb_";
    },
  });

  if (p.isCancel(key)) {
    p.cancel("Login cancelled.");
    process.exit(0);
  }

  showSavedKey(key, saveApiKey(key, appId, appVersion, clearAppId));
}

async function loginWithBrowser(host: string, appId?: string, appVersion?: string, clearAppId = false): Promise<void> {
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
      const saveResult = saveApiKey(key, appId, appVersion, clearAppId);

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");

      spinner.stop(`Authenticated — ${key.slice(0, 12)}...`);
      p.note(
        [
          "Key saved to ~/.orbit-cli/config.json",
          appMetadataNote(saveResult),
          "Run `orbit search` to get started.",
        ].filter(Boolean).join("\n"),
        "Ready"
      );

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 300);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const spinner = p.spinner();

  server.listen(port, "127.0.0.1", () => {
    p.note(authUrl, "If the browser doesn't open, visit");
    spinner.start("Waiting for browser authentication...");

    const platform = process.platform;
    const cmd =
      platform === "darwin" ? "open" :
      platform === "win32" ? "start" :
      "xdg-open";

    execCb(`${cmd} "${authUrl}"`, () => {});
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

export async function loginCommand(options: LoginOptions): Promise<void> {
  if (options.appId && options.clearAppId) {
    p.cancel("Use either --app-id or --clear-app-id, not both.");
    process.exit(1);
  }
  if (options.appVersion && !options.appId) {
    p.cancel("Use --app-version only together with --app-id.");
    process.exit(1);
  }

  // Non-interactive: direct key input via flag
  if (options.key) {
    if (!options.key.startsWith("sk_orb_")) {
      p.cancel("Invalid API key format. Keys should start with sk_orb_");
      process.exit(1);
    }
    showSavedKey(options.key, saveApiKey(options.key, options.appId, options.appVersion, options.clearAppId));
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
    await loginWithKey(options.appId, options.appVersion, options.clearAppId);
  } else {
    await loginWithBrowser(host, options.appId, options.appVersion, options.clearAppId);
  }
}
