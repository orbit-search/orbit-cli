/**
 * MCP client wrapper — spawns the orbit-chatgpt-app MCP server as a subprocess
 * and calls its tools via the MCP protocol.
 */
export interface McpCallResult {
    text: string;
    structured?: unknown;
    isError?: boolean;
}
export declare class OrbitMcpClient {
    private serverPath?;
    private env?;
    private client;
    private transport;
    constructor(serverPath?: string | undefined, env?: Record<string, string> | undefined);
    private getServerPath;
    connect(): Promise<void>;
    callTool(name: string, args?: Record<string, unknown>): Promise<McpCallResult>;
    listTools(): Promise<string[]>;
    close(): Promise<void>;
}
//# sourceMappingURL=mcp-client.d.ts.map