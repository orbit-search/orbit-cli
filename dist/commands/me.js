import { getMyProfile, formatProfile } from "../api.js";
import { getApiKey } from "../utils/config.js";
export async function meCommand(options) {
    if (!getApiKey()) {
        console.error("Not authenticated. Run `orbit login` first.");
        process.exit(1);
    }
    try {
        const profile = await getMyProfile();
        if (options.json) {
            console.log(JSON.stringify(profile, null, 2));
        }
        else {
            console.log(formatProfile(profile));
        }
    }
    catch (error) {
        console.error(`Failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}
//# sourceMappingURL=me.js.map