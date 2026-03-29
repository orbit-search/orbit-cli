import { SocialApiClient } from '../api/social-api.js';
import { DeepSearchClient } from '../api/deep-search.js';
import { loadConfig, getSocialApiConfig, getDeepSearchConfig } from '../utils/config.js';
import { formatProfiles, combineProfiles, formatError } from '../utils/formatter.js';
import type { CombinedProfile } from '../api/types.js';

export interface SmartSearchOptions {
  limit?: number;
  json?: boolean;
}

export async function smartSearchCommand(query: string, options: SmartSearchOptions): Promise<void> {
  try {
    const config = loadConfig();
    const socialClient = new SocialApiClient(getSocialApiConfig(config));
    const deepSearchClient = new DeepSearchClient(getDeepSearchConfig(config));

    console.error(`Smart search: "${query}"`);

    const result = await socialClient.smartSearch(query, options.limit ?? 6);

    if (!result) {
      console.error('Smart search endpoint is currently unavailable.');
      console.error('Falling back to basic profile search...');
      
      // Fallback: try to extract name and search profiles
      const searchResult = await deepSearchClient.searchProfiles(query);
      
      if (!searchResult.success || !searchResult.profiles || searchResult.profiles.length === 0) {
        console.log('No profiles found.');
        return;
      }

      const combinedProfiles: CombinedProfile[] = [];
      for (const deepProfile of searchResult.profiles.slice(0, options.limit ?? 3)) {
        let socialProfile = null;
        if (deepProfile.sendit_id) {
          try {
            socialProfile = await socialClient.getProfileByUserId(deepProfile.sendit_id);
          } catch {
            // Continue without social profile
          }
        }
        combinedProfiles.push(combineProfiles(deepProfile, socialProfile));
      }

      const format = options.json ? 'json' : 'text';
      console.log(formatProfiles(combinedProfiles, format));
      return;
    }

    if (result.status !== 'success' || !result.payload?.users || result.payload.users.length === 0) {
      console.log('No profiles found.');
      return;
    }

    const combinedProfiles: CombinedProfile[] = [];

    for (const user of result.payload.users) {
      let socialProfile = null;
      let deepProfile = null;

      try {
        socialProfile = await socialClient.getProfileByUserId(user.userId);
      } catch {
        // Continue without social profile
      }

      if (socialProfile) {
        combinedProfiles.push(combineProfiles(null, socialProfile));
      }
    }

    if (combinedProfiles.length === 0) {
      console.log('Found users but could not fetch detailed profiles.');
      console.log(JSON.stringify(result.payload.users, null, 2));
      return;
    }

    const format = options.json ? 'json' : 'text';
    console.log(formatProfiles(combinedProfiles, format));
  } catch (error) {
    console.error(formatError(error));
    process.exit(1);
  }
}
