import { searchPeople } from "../api.js";
export async function searchCommand(query, options) {
    try {
        const results = await searchPeople(query);
        if (results.length === 0) {
            console.log(`No results found for "${query}".`);
            return;
        }
        if (options.json) {
            console.log(JSON.stringify(results, null, 2));
        }
        else {
            for (const r of results) {
                const parts = [r.displayName];
                if (r.age)
                    parts.push(`${r.age}`);
                if (r.city)
                    parts.push(r.city);
                console.log(`${parts.join(" | ")}  [${r.userId}]`);
                if (r.matchReason)
                    console.log(`  ${r.matchReason}`);
            }
            console.log(`\n${results.length} result${results.length === 1 ? "" : "s"} for "${query}"`);
        }
    }
    catch (error) {
        console.error(`Search failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}
//# sourceMappingURL=search.js.map