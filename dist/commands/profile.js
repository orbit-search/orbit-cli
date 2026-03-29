import { DeepSearchClient } from '../api/deep-search.js';
import { SocialApiClient } from '../api/social-api.js';
import { loadConfig, getDeepSearchConfig, getSocialApiConfig } from '../utils/config.js';
import { formatProfile, combineProfiles, formatError } from '../utils/formatter.js';
export async function profileCommand(id, options) {
    try {
        const config = loadConfig();
        const deepSearchClient = new DeepSearchClient(getDeepSearchConfig(config));
        const socialClient = new SocialApiClient(getSocialApiConfig(config));
        let combinedProfile = null;
        // First, try as orbit_id (deep search profile)
        console.error(`Trying orbit ID: ${id}...`);
        let fullProfile = null;
        let socialProfile = null;
        try {
            fullProfile = await deepSearchClient.getFullProfile(id);
        }
        catch {
            // Not a valid orbit_id or API error
        }
        if (fullProfile) {
            console.error(`Found orbit profile for ${id}`);
            if (fullProfile.sendit_id) {
                try {
                    socialProfile = await socialClient.getProfileByUserId(fullProfile.sendit_id);
                }
                catch {
                    // Continue without social profile
                }
            }
            combinedProfile = combineProfiles(fullProfile, socialProfile);
        }
        else {
            // Try as sendit_id (social profile UUID)
            console.error(`Trying social profile ID: ${id}...`);
            socialProfile = await socialClient.getProfileByUserId(id);
            if (socialProfile) {
                combinedProfile = combineProfiles(null, socialProfile);
            }
        }
        if (!combinedProfile) {
            console.error(`No profile found for ID ${id}`);
            process.exit(1);
        }
        let format = 'text';
        if (options.json) {
            format = 'json';
        }
        else if (options.brief) {
            format = 'brief';
        }
        const section = options.sources ? 'sources' : options.section;
        const output = formatProfile(combinedProfile, format, section);
        console.log(output);
    }
    catch (error) {
        console.error(formatError(error));
        process.exit(1);
    }
}
//# sourceMappingURL=profile.js.map