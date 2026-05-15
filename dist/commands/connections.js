import { getProfile } from "../api.js";
export async function connectionsCommand(profileId, options) {
    try {
        const profile = await getProfile(profileId);
        const conns = profile.orbitFirstDegree;
        const limit = options.limit ?? conns.length;
        const shown = conns.slice(0, limit);
        if (conns.length === 0) {
            console.log(`No connections found for ${profile.displayName ?? profileId}.`);
            return;
        }
        if (options.json) {
            console.log(JSON.stringify(shown, null, 2));
        }
        else {
            console.log(`${profile.displayName ?? "Unknown"} — ${conns.length} connections\n`);
            for (const c of shown) {
                console.log(`  ${c.fullName}  [${c.profileId}]`);
            }
            if (limit < conns.length) {
                console.log(`\n  ... ${conns.length - limit} more (use --limit to show more)`);
            }
        }
    }
    catch (error) {
        console.error(`Failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}
//# sourceMappingURL=connections.js.map