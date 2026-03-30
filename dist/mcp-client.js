/**
 * MCP client wrapper — spawns the orbit-chatgpt-app MCP server as a subprocess
 * and calls its tools via the MCP protocol.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
const MCP_SERVER_SCRIPT = resolve(process.env.ORBIT_MCP_SERVER_PATH ||
    new URL("../../node_modules/.orbit-mcp-server/dist/index.js", import.meta.url).pathname);
// Default to the orbit-chatgpt-app stdio entrypoint
const DEFAULT_SERVER_PATH = resolve(process.env.HOME || "~", "Projects/work/orbit/orbit-chatgpt-app/dist/stdio.js");
export class OrbitMcpClient {
    serverPath;
    env;
    client = null;
    transport = null;
    constructor(serverPath, env) {
        this.serverPath = serverPath;
        this.env = env;
    }
    getServerPath() {
        return this.serverPath || process.env.ORBIT_MCP_SERVER_PATH || DEFAULT_SERVER_PATH;
    }
    async connect() {
        const serverPath = this.getServerPath();
        this.transport = new StdioClientTransport({
            command: "node",
            args: [serverPath],
            env: {
                ...process.env,
                ...this.env,
            },
        });
        this.client = new Client({ name: "orbit-cli", version: "1.0.0" }, { capabilities: {} });
        await this.client.connect(this.transport);
    }
    async callTool(name, args = {}) {
        if (!this.client) {
            throw new Error("MCP client not connected. Call connect() first.");
        }
        const result = await this.client.callTool({ name, arguments: args });
        const textContent = result.content
            ?.filter((c) => c.type === "text")
            ?.map((c) => c.text)
            ?.join("\n") ?? "";
        return {
            text: textContent,
            structured: result.structuredContent,
            isError: result.isError === true,
        };
    }
    async listTools() {
        if (!this.client) {
            throw new Error("MCP client not connected. Call connect() first.");
        }
        const result = await this.client.listTools();
        return result.tools.map((t) => t.name);
    }
    async close() {
        if (this.transport) {
            await this.transport.close();
            this.transport = null;
            this.client = null;
        }
    }
}
//# sourceMappingURL=mcp-client.js.map