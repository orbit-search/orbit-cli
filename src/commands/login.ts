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
  clearedAppVersion: boolean;
  keptExistingAppId: boolean;
  missingAppId: boolean;
  clearedRequesterProfileId: boolean;
  clearedAppMetadata: boolean;
}

function readSavedAppId(): string | undefined {
  if (!existsSync(CONFIG_FILE)) return undefined;
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as Record<string, unknown>;
    return typeof config.appId === "string" ? config.appId : undefined;
  } catch {
    return undefined;
  }
}

function saveApiKey(
  apiKey: string,
  appId?: string,
  appVersion?: string,
  clearAppId = false,
  reuseExistingAppId = false
): SaveApiKeyResult {
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
  const previousApiKey =
    typeof config.apiKey === "string"
      ? config.apiKey
      : typeof config.orbitApiKey === "string"
        ? config.orbitApiKey
        : undefined;
  const previousAppId = typeof config.appId === "string" ? config.appId : undefined;
  const hadAppVersion = Boolean(config.appVersion);
  let clearedAppVersion = false;
  let clearedRequesterProfileId = false;
  config.apiKey = apiKey;
  delete config.orbitApiKey;
  if (appId) {
    config.appId = appId;
    if (appVersion) {
      config.appVersion = appVersion;
    } else if (hadAppVersion && previousAppId !== appId) {
      delete config.appVersion;
      clearedAppVersion = true;
    }
    if (previousAppId !== appId || previousApiKey !== apiKey) {
      delete config.requestingProfileId;
      clearedRequesterProfileId = hadRequesterProfileId;
    }
  } else if (clearAppId) {
    delete config.appId;
    delete config.appVersion;
    delete config.requestingProfileId;
    clearedRequesterProfileId = hadRequesterProfileId;
  } else if (previousApiKey !== apiKey && hadRequesterProfileId) {
    delete config.requestingProfileId;
    clearedRequesterProfileId = true;
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");

  return {
    savedAppId: Boolean(appId && !reuseExistingAppId),
    savedAppVersion: Boolean(appId && appVersion),
    clearedAppVersion,
    keptExistingAppId: (!appId && !clearAppId && Boolean(config.appId)) || reuseExistingAppId,
    missingAppId: !appId && !clearAppId && !config.appId,
    clearedRequesterProfileId,
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
    const versionNote = result.savedAppVersion
      ? " App version was saved."
      : result.clearedAppVersion
        ? " Saved app version was cleared; pass --app-version if this app ID requires a specific version."
        : "";
    return `App metadata was saved with this key.${versionNote}${requesterNote}`;
  }
  if (result.keptExistingAppId) {
    const versionNote = result.savedAppVersion ? " App version was saved." : "";
    const requesterNote = result.clearedRequesterProfileId
      ? " Saved request context was cleared during login."
      : "";
    return `Existing app metadata was kept.${versionNote}${requesterNote} Pass --app-id to replace it or --clear-app-id to remove it.`;
  }
  if (result.clearedAppMetadata) {
    return "Saved app metadata and request context were removed.";
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

async function loginWithKey(
  appId?: string,
  appVersion?: string,
  clearAppId = false,
  reuseExistingAppId = false
): Promise<void> {
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

  showSavedKey(key, saveApiKey(key, appId, appVersion, clearAppId, reuseExistingAppId));
}

async function loginWithBrowser(
  host: string,
  appId?: string,
  appVersion?: string,
  clearAppId = false,
  reuseExistingAppId = false
): Promise<void> {
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
      const saveResult = saveApiKey(key, appId, appVersion, clearAppId, reuseExistingAppId);

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
  if (options.appVersion && options.clearAppId) {
    p.cancel("Use either --app-version or --clear-app-id, not both.");
    process.exit(1);
  }
  let appId = options.appId;
  let reuseExistingAppId = false;
  if (options.appVersion && !options.appId) {
    const existingAppId = readSavedAppId();
    const envAppId = process.env.ORBIT_APP_ID;
    if (existingAppId) {
      if (envAppId && envAppId !== existingAppId) {
        p.cancel("ORBIT_APP_ID differs from saved app metadata. Set ORBIT_APP_VERSION for the env app ID, or pass --app-id to replace saved metadata.");
        process.exit(1);
      }
      appId = existingAppId;
      reuseExistingAppId = true;
    } else if (envAppId) {
      p.cancel("Set ORBIT_APP_VERSION when ORBIT_APP_ID is configured via environment, or pass --app-id to save app metadata.");
      process.exit(1);
    } else {
      p.cancel("Use --app-version only together with --app-id.");
      process.exit(1);
    }
  }

  // Non-interactive: direct key input via flag
  if (options.key) {
    if (!options.key.startsWith("sk_orb_")) {
      p.cancel("Invalid API key format. Keys should start with sk_orb_");
      process.exit(1);
    }
    showSavedKey(options.key, saveApiKey(options.key, appId, options.appVersion, options.clearAppId, reuseExistingAppId));
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
    await loginWithKey(appId, options.appVersion, options.clearAppId, reuseExistingAppId);
  } else {
    await loginWithBrowser(host, appId, options.appVersion, options.clearAppId, reuseExistingAppId);
  }
}
