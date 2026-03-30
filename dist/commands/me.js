import { OrbitMcpClient } from "../mcp-client.js";
import { getServerEnv, getApiKey } from "../utils/config.js";
export async function meCommand(options) {
    if (!getApiKey()) {
        console.error("Not authenticated. Run `orbit login` first.");
        process.exit(1);
    }
    const client = new OrbitMcpClient(undefined, getServerEnv());
    try {
        await client.connect();
        const result = await client.callTool("me");
        if (options.json && result.structured) {
            console.log(JSON.stringify(result.structured, null, 2));
        }
        else {
            console.log(result.text);
        }
        if (result.isError) {
            process.exit(1);
        }
    }
    catch (error) {
        console.error(`Failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
    finally {
        await client.close();
    }
}
//# sourceMappingURL=me.js.map