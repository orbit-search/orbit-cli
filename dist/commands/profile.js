import { getProfile, formatProfile, formatProfileBrief } from "../api.js";
export async function profileCommand(profileId, options) {
    try {
        const profile = await getProfile(profileId);
        if (options.json) {
            console.log(JSON.stringify(profile, null, 2));
        }
        else if (options.brief) {
            console.log(formatProfileBrief(profile));
        }
        else {
            console.log(formatProfile(profile));
        }
    }
    catch (error) {
        console.error(`Profile fetch failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}
//# sourceMappingURL=profile.js.map