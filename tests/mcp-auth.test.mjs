/** Prove token isolation and refresh rotation across concurrent CLI processes. */
import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { trustedUrl } from "../dist/mcp-auth.js";

test("OAuth URLs reject cross-origin targets, embedded credentials and non-HTTPS hosts", () => {
  for (const url of ["http://remote.example/oauth", "https://user:secret@example.com/oauth", "https://example.com/oauth#secret", "https://other.example/oauth"]) {
    assert.throws(() => trustedUrl(url, "https://example.com"), /Untrusted/);
  }
  assert.equal(trustedUrl("http://127.0.0.1:1234/oauth"), "http://127.0.0.1:1234/oauth");
});
async function fixture(handler, operation) {
  const home = await mkdtemp(join(tmpdir(), "orbit-mcp-refresh-"));
  const server = createServer(handler).listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  const file = join(home, ".orbit-cli", "mcp-auth.json");
  await mkdir(join(home, ".orbit-cli"));
  await writeFile(file, JSON.stringify({ issuer: `${origin}/mcp-auth`, server: `${origin}/mcp`, clientId: "fixture-client",
    tokenEndpoint: `${origin}/oauth/token`, revokeEndpoint: `${origin}/oauth/revoke`, accessToken: "expired-access",
    refreshToken: "old-refresh", expiresAt: Date.now() - 1, scope: "search.read" }));
  const run = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["bin/orbit-mcp", "whoami"], { env: { ...process.env, HOME: home }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; }); child.stderr.on("data", chunk => { stderr += chunk; });
    child.once("error", reject); child.once("exit", code => resolve({ code, stdout, stderr }));
  });
  try { await operation({ file, run }); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(home, { recursive: true, force: true }); }
}
test("concurrent processes refresh exactly once and never print saved credentials", async () => {
  let requests = 0;
  await fixture(async (req, res) => {
    requests++;
    let body = ""; for await (const part of req) body += part;
    assert.equal(new URLSearchParams(body).get("refresh_token"), "old-refresh");
    await new Promise(resolve => setTimeout(resolve, 200));
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ access_token: "rotated-access-secret", refresh_token: "rotated-refresh-secret", token_type: "Bearer", expires_in: 3600, scope: "search.read" }));
  }, async ({ file, run }) => {
    const results = await Promise.all([run(), run()]);
    for (const result of results) {
      assert.equal(result.code, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).status, "connected");
      assert.doesNotMatch(result.stdout + result.stderr, /rotated-|old-refresh/);
    }
    assert.equal(requests, 1);
    assert.equal(JSON.parse(await readFile(file, "utf8")).refreshToken, "rotated-refresh-secret");
  });
});
test("ambiguous refresh cannot replay a potentially rotated family token", async () => {
  let requests = 0;
  await fixture((req) => { requests++; req.socket.destroy(); }, async ({ file, run }) => {
    assert.equal((await run()).code, 1);
    await assert.rejects(readFile(file), /ENOENT/);
    assert.equal((await run()).code, 1);
    assert.equal(requests, 1);
  });
});
