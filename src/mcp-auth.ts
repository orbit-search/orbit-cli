/** Browserless MCP OAuth with private local token storage and serialized refresh. */
import { mkdir, readFile, writeFile, rename, unlink, rm, stat, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

export const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";
export const DEFAULT_ISSUER = "https://api.orbitsearch.com/mcp-auth";
export const DEFAULT_SERVER = "https://api.orbitsearch.com/mcp";
const dir = join(homedir(), ".orbit-cli");
const file = join(dir, "mcp-auth.json");
const lock = join(dir, "mcp-auth.lock");
export type McpAuth = {
  issuer: string; server: string; clientId: string; tokenEndpoint: string; revokeEndpoint: string;
  accessToken: string; refreshToken: string; expiresAt: number; scope: string;
};
type Json = Record<string, unknown>;

/** Restrict credentials to HTTPS (or explicit loopback development) and one origin. */
export function trustedUrl(value: string, origin?: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.hash || url.search || (origin && url.origin !== origin)
    || !(url.protocol === "https:" || url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error("Untrusted Orbit authentication URL.");
  return url.toString().replace(/\/$/, "");
}
async function jsonRequest(url: string, init: RequestInit = {}): Promise<{ response: Response; body: Json }> {
  const response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(30000) });
  let body: Json;
  try { body = await response.json() as Json; }
  catch { throw new Error(`Orbit authentication returned HTTP ${response.status} without JSON.`); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid Orbit authentication response.");
  return { response, body };
}
async function post(url: string, form: Record<string, string>) {
  return jsonRequest(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form) });
}
function requireString(body: Json, key: string): string {
  if (typeof body[key] !== "string" || !body[key]) throw new Error(`Orbit authentication response is missing ${key}.`);
  return body[key];
}
function tokenUpdate(auth: Omit<McpAuth, "accessToken" | "refreshToken" | "expiresAt">, body: Json): McpAuth {
  if (body.token_type !== "Bearer" || typeof body.expires_in !== "number" || body.expires_in <= 0) throw new Error("Invalid Orbit token response.");
  return { ...auth, accessToken: requireString(body, "access_token"), refreshToken: requireString(body, "refresh_token"),
    expiresAt: Date.now() + body.expires_in * 1000, scope: requireString(body, "scope") };
}
async function privateDirectory() { await mkdir(dir, { recursive: true, mode: 0o700 }); await chmod(dir, 0o700); }
async function save(auth: McpAuth) {
  await privateDirectory();
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temp, JSON.stringify(auth) + "\n", { mode: 0o600, flag: "wx" }); await rename(temp, file); }
  finally { await unlink(temp).catch(() => {}); }
}
async function read(): Promise<McpAuth> {
  let auth: McpAuth;
  try { auth = JSON.parse(await readFile(file, "utf8")) as McpAuth; }
  catch { throw new Error("Run `orbit-mcp login` and ask the user to approve the link on their own device."); }
  const issuer = trustedUrl(auth.issuer);
  const origin = new URL(issuer).origin;
  trustedUrl(auth.server, origin); trustedUrl(auth.tokenEndpoint, origin); trustedUrl(auth.revokeEndpoint, origin);
  if (!auth.clientId || !auth.accessToken || !auth.refreshToken || !Number.isFinite(auth.expiresAt)) throw new Error("Invalid MCP login file. Run `orbit-mcp login` again.");
  return auth;
}
async function withLock<T>(operation: () => Promise<T>): Promise<T> {
  await privateDirectory();
  const deadline = Date.now() + 35000;
  while (true) {
    try { await mkdir(lock, { mode: 0o700 }); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      // All network requests time out in 30s. Recover only abandoned older locks.
      const info = await stat(lock).catch(() => undefined);
      if (info && Date.now() - info.mtimeMs > 120000) { await rm(lock, { recursive: true, force: true }); continue; }
      if (Date.now() >= deadline) throw new Error("Another Orbit MCP process is updating login. Try again shortly.");
      await delay(100);
    }
  }
  try { return await operation(); } finally { await rm(lock, { recursive: true, force: true }); }
}

/** Emit only the public link and code, then wait without opening a browser. */
export async function deviceLogin(options: { issuer?: string; server?: string; scope?: string }, emit: (event: Json) => void): Promise<void> {
  const issuer = trustedUrl(options.issuer || DEFAULT_ISSUER);
  const origin = new URL(issuer).origin;
  const server = trustedUrl(options.server || DEFAULT_SERVER, origin);
  const metadata = await jsonRequest(`${issuer}/.well-known/oauth-authorization-server`);
  if (!metadata.response.ok || metadata.body.issuer !== issuer) throw new Error("Orbit MCP OAuth discovery failed.");
  if (!metadata.body.device_authorization_endpoint) throw new Error("This Orbit server has not enabled remote approval login yet.");
  const deviceEndpoint = trustedUrl(requireString(metadata.body, "device_authorization_endpoint"), origin);
  const tokenEndpoint = trustedUrl(requireString(metadata.body, "token_endpoint"), origin);
  const revokeEndpoint = trustedUrl(requireString(metadata.body, "revocation_endpoint"), origin);
  const registerEndpoint = trustedUrl(requireString(metadata.body, "registration_endpoint"), origin);
  const registered = await jsonRequest(registerEndpoint, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_name: "Orbit MCP CLI", redirect_uris: [], token_endpoint_auth_method: "none", grant_types: [DEVICE_GRANT, "refresh_token"], response_types: [] }) });
  if (!registered.response.ok) throw new Error(`Orbit client registration failed (HTTP ${registered.response.status}).`);
  const clientId = requireString(registered.body, "client_id");
  const scope = options.scope || "search.read";
  const started = await post(deviceEndpoint, { client_id: clientId, resource: server, scope });
  if (!started.response.ok) throw new Error(`Orbit remote login failed (${typeof started.body.error === "string" ? started.body.error : started.response.status}).`);
  const code = requireString(started.body, "device_code");
  const uri = requireString(started.body, "verification_uri_complete");
  const verification = new URL(uri);
  // Only the server-issued confirmation-code query may be shared with the user.
  trustedUrl(`${verification.origin}${verification.pathname}`, origin);
  if (typeof started.body.expires_in !== "number" || started.body.expires_in <= 0 || started.body.expires_in > 1800) throw new Error("Invalid Orbit login lifetime.");
  const deadline = Date.now() + started.body.expires_in * 1000;
  let interval = Math.max(5, typeof started.body.interval === "number" ? started.body.interval : 5);
  emit({ status: "approval_required", verification_uri_complete: uri, user_code: requireString(started.body, "user_code"), expires_in: started.body.expires_in });
  while (Date.now() < deadline) {
    await delay(Math.min(interval * 1000, deadline - Date.now()));
    if (Date.now() >= deadline) break;
    let result: Awaited<ReturnType<typeof post>>;
    try { result = await post(tokenEndpoint, { grant_type: DEVICE_GRANT, device_code: code, client_id: clientId, resource: server }); }
    catch { interval = Math.min(interval * 2, 60); continue; }
    if (result.response.ok) {
      const auth = tokenUpdate({ issuer, server, clientId, tokenEndpoint, revokeEndpoint, scope }, result.body);
      await withLock(() => save(auth));
      emit({ status: "connected", server, scope: auth.scope });
      return;
    }
    if (result.body.error === "authorization_pending") continue;
    if (result.body.error === "slow_down") { interval += 5; continue; }
    if (result.response.status === 429 || result.response.status >= 500) {
      interval = Math.max(interval, Number(result.response.headers.get("retry-after")) || 10); continue;
    }
    throw new Error(result.body.error === "access_denied" ? "The user denied this login."
      : result.body.error === "expired_token" ? "Login expired. Run `orbit-mcp login` again." : "Orbit rejected this login. Run `orbit-mcp login` again.");
  }
  throw new Error("Login expired. Run `orbit-mcp login` again.");
}

/** Refresh once under an inter-process lock; never replay a rotated refresh token. */
export async function currentMcpAuth(): Promise<McpAuth> {
  const auth = await read();
  if (auth.expiresAt > Date.now() + 60000) return auth;
  return withLock(async () => {
    const latest = await read();
    if (latest.expiresAt > Date.now() + 60000) return latest;
    try {
      const result = await post(latest.tokenEndpoint, { grant_type: "refresh_token", refresh_token: latest.refreshToken, client_id: latest.clientId, resource: latest.server });
      if (!result.response.ok) throw new Error("renewal rejected");
      const next = tokenUpdate(latest, result.body);
      await save(next);
      return next;
    } catch {
      // A timeout may have rotated the token. Never replay the old family token.
      await unlink(file).catch(() => {});
      throw new Error("Orbit MCP renewal failed. Run `orbit-mcp login` again.");
    }
  });
}
export async function logoutMcp(): Promise<void> {
  await withLock(async () => {
    const auth = await read();
    const response = await fetch(auth.revokeEndpoint, { method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
      headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: auth.refreshToken, client_id: auth.clientId }) });
    if (!response.ok) throw new Error("Orbit MCP revocation failed. Login was retained so you can retry logout.");
    await unlink(file);
  });
}
