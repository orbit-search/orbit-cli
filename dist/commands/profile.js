import { OrbitMcpClient } from "../mcp-client.js";
import { getServerEnv } from "../utils/config.js";
export async function profileCommand(userId, options) {
    const client = new OrbitMcpClient(undefined, getServerEnv());
    try {
        await client.connect();
        const result = await client.callTool("get_profile", { userId });
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
        console.error(`Profile fetch failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
    finally {
        await client.close();
    }
}
//# sourceMappingURL=profile.js.map