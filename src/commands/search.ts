import { OrbitMcpClient } from "../mcp-client.js";
import { getServerEnv } from "../utils/config.js";

export interface SearchOptions {
  limit?: number;
  json?: boolean;
}

export async function searchCommand(query: string, options: SearchOptions): Promise<void> {
  const client = new OrbitMcpClient(undefined, getServerEnv());

  try {
    await client.connect();
    const result = await client.callTool("search_people", { query });

    if (options.json && result.structured) {
      console.log(JSON.stringify(result.structured, null, 2));
    } else {
      console.log(result.text);
    }

    if (result.isError) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`Search failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  } finally {
    await client.close();
  }
}
