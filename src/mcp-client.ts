/**
 * MCP client wrapper — spawns the orbit-chatgpt-app MCP server as a subprocess
 * and calls its tools via the MCP protocol.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";

const MCP_SERVER_SCRIPT = resolve(
  process.env.ORBIT_MCP_SERVER_PATH ||
    new URL("../../node_modules/.orbit-mcp-server/dist/index.js", import.meta.url).pathname
);

// Default to the orbit-chatgpt-app stdio entrypoint
const DEFAULT_SERVER_PATH = resolve(
  process.env.HOME || "~",
  "Projects/work/orbit/orbit-chatgpt-app/dist/stdio.js"
);

export interface McpCallResult {
  text: string;
  structured?: unknown;
  isError?: boolean;
}

export class OrbitMcpClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(
    private serverPath?: string,
    private env?: Record<string, string>
  ) {}

  private getServerPath(): string {
    return this.serverPath || process.env.ORBIT_MCP_SERVER_PATH || DEFAULT_SERVER_PATH;
  }

  async connect(): Promise<void> {
    const serverPath = this.getServerPath();

    this.transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      env: {
        ...process.env,
        ...this.env,
      } as Record<string, string>,
    });

    this.client = new Client(
      { name: "orbit-cli", version: "1.0.0" },
      { capabilities: {} }
    );

    await this.client.connect(this.transport);
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<McpCallResult> {
    if (!this.client) {
      throw new Error("MCP client not connected. Call connect() first.");
    }

    const result = await this.client.callTool({ name, arguments: args });

    const textContent = (result.content as Array<{ type: string; text: string }>)
      ?.filter((c) => c.type === "text")
      ?.map((c) => c.text)
      ?.join("\n") ?? "";

    return {
      text: textContent,
      structured: (result as any).structuredContent,
      isError: result.isError === true,
    };
  }

  async listTools(): Promise<string[]> {
    if (!this.client) {
      throw new Error("MCP client not connected. Call connect() first.");
    }

    const result = await this.client.listTools();
    return result.tools.map((t) => t.name);
  }

  async close(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
      this.client = null;
    }
  }
}
