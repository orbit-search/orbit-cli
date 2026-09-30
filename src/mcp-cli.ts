#!/usr/bin/env node
/** Agent-friendly login, tool calls, and a stdio bridge to the public Orbit MCP. */
import { Command } from "commander";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { currentMcpAuth, deviceLogin, logoutMcp } from "./mcp-auth.js";

const print = (value: unknown) => console.log(JSON.stringify(value));
const program = new Command().name("orbit-mcp").description("Use Orbit MCP from a remote agent; approve login on your own device.");
program.command("login").description("Print a user approval link and wait; no browser or local callback")
  .option("--issuer <url>", "OAuth issuer (default: https://api.orbitsearch.com/mcp-auth)")
  .option("--server <url>", "MCP resource (default: https://api.orbitsearch.com/mcp)")
  .option("--scope <scopes>", "Space-separated permissions", "search.read")
  .action(options => deviceLogin(options, print));
program.command("logout").description("Revoke the MCP login and remove local tokens")
  .action(async () => { await logoutMcp(); print({ status: "disconnected" }); });
program.command("whoami").description("Show MCP connection status without revealing tokens")
  .action(async () => { const auth = await currentMcpAuth(); print({ status: "connected", server: auth.server, scope: auth.scope }); });

async function transport(): Promise<StreamableHTTPClientTransport> {
  const auth = await currentMcpAuth();
  return new StreamableHTTPClientTransport(new URL(auth.server), {
    // Read/refresh before each request so long-lived stdio sessions renew too.
    fetch: async (input, init) => {
      const latest = await currentMcpAuth();
      if (latest.server !== auth.server || latest.clientId !== auth.clientId) throw new Error("Orbit login changed. Reconnect the MCP client.");
      const headers = new Headers(init?.headers);
      headers.set("authorization", `Bearer ${latest.accessToken}`);
      return fetch(input, { ...init, headers, redirect: "error" });
    }
  });
}
async function withClient(operation: (client: Client) => Promise<unknown>) {
  const client = new Client({ name: "orbit-mcp-cli", version: "1.0.0" });
  try { await client.connect(await transport()); print(await operation(client)); }
  finally { await client.close(); }
}
program.command("tools").description("List the connected MCP's tools as JSON")
  .action(() => withClient(client => client.listTools()));
program.command("call").description("Call one MCP tool; mutations are never automatically retried")
  .argument("<tool>").option("--arguments <json>", "Tool arguments as a JSON object", "{}")
  .action(async (name: string, options: { arguments: string }) => {
    const args: unknown = JSON.parse(options.arguments);
    if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("--arguments must be a JSON object.");
    await withClient(client => client.callTool({ name, arguments: args as Record<string, unknown> }));
  });
program.command("stdio").description("Bridge an MCP host's stdio to the authenticated public server")
  .action(async () => {
    const remote = await transport();
    const local = new StdioServerTransport();
    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true;
      await remote.close(); await local.close();
    };
    remote.onmessage = message => {
      if ("result" in message && message.result && typeof message.result === "object" && "protocolVersion" in message.result
        && typeof message.result.protocolVersion === "string") remote.setProtocolVersion(message.result.protocolVersion);
      void local.send(message).catch(() => close());
    };
    remote.onerror = () => { console.error("Orbit MCP transport failed. Reconnect; paid operations were not automatically retried."); };
    local.onmessage = message => {
      void remote.send(message).catch(async () => {
        if ("id" in message && message.id !== undefined) await local.send({ jsonrpc: "2.0", id: message.id,
          error: { code: -32000, message: "Orbit MCP request failed. Check login and reconnect before retrying." } });
      });
    };
    local.onclose = () => { void close(); };
    process.stdin.once("end", () => { void close(); });
    process.once("SIGINT", () => { void close(); });
    process.once("SIGTERM", () => { void close(); });
    await remote.start(); await local.start();
  });

program.parseAsync().catch(error => {
  console.error(error instanceof Error ? error.message : "Orbit MCP command failed.");
  process.exitCode = 1;
});
