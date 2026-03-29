import { DeepSearchClient } from '../api/deep-search.js';
import { SocialApiClient } from '../api/social-api.js';
import { loadConfig, getDeepSearchConfig, getSocialApiConfig } from '../utils/config.js';
import { formatProfiles, combineProfiles, formatError } from '../utils/formatter.js';
export async function searchCommand(query, options) {
    try {
        const config = loadConfig();
        const deepSearchClient = new DeepSearchClient(getDeepSearchConfig(config));
        const socialClient = new SocialApiClient(getSocialApiConfig(config));
        const limit = options.limit ?? 3;
        console.error(`Searching for "${query}"...`);
        const searchResult = await deepSearchClient.searchProfiles(query, options.age);
        if (!searchResult.success || !searchResult.profiles || searchResult.profiles.length === 0) {
            console.log('No profiles found.');
            return;
        }
        const profilesToProcess = searchResult.profiles.slice(0, limit);
        const combinedProfiles = [];
        for (const deepProfile of profilesToProcess) {
            let socialProfile = null;
            let fullOrbitProfile = null;
            // Step 1: Fetch full orbit profile to get sendit_id and richer data
            if (deepProfile.orbit_id) {
                try {
                    fullOrbitProfile = await deepSearchClient.getFullProfile(deepProfile.orbit_id);
                }
                catch {
                    // Continue without full orbit profile
                }
            }
            // Step 2: If we got a sendit_id, fetch the rich social profile
            const senditId = fullOrbitProfile?.sendit_id || deepProfile.sendit_id;
            if (senditId) {
                try {
                    socialProfile = await socialClient.getProfileByUserId(senditId);
                }
                catch {
                    // Graceful degradation - continue without social profile
                }
            }
            // Use the full orbit profile if available, otherwise fall back to search result
            const combined = combineProfiles(fullOrbitProfile || deepProfile, socialProfile);
            combinedProfiles.push(combined);
        }
        const format = options.json ? 'json' : options.verbose ? 'text' : 'text';
        const output = formatProfiles(combinedProfiles, format);
        console.log(output);
    }
    catch (error) {
        console.error(formatError(error));
        process.exit(1);
    }
}
//# sourceMappingURL=search.js.map