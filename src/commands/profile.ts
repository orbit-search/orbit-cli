import { DeepSearchClient } from '../api/deep-search.js';
import { SocialApiClient } from '../api/social-api.js';
import { loadConfig, getDeepSearchConfig, getSocialApiConfig } from '../utils/config.js';
import { formatProfile, combineProfiles, formatError } from '../utils/formatter.js';
import type { OutputFormat, CombinedProfile, FullOrbitProfile } from '../api/types.js';

export interface ProfileOptions {
  json?: boolean;
  section?: string;
  brief?: boolean;
  sources?: boolean;
}

export async function profileCommand(id: string, options: ProfileOptions): Promise<void> {
  try {
    const config = loadConfig();
    const deepSearchClient = new DeepSearchClient(getDeepSearchConfig(config));
    const socialClient = new SocialApiClient(getSocialApiConfig(config));

    let combinedProfile: CombinedProfile | null = null;

    // First, try as orbit_id (deep search profile)
    console.error(`Trying orbit ID: ${id}...`);
    let fullProfile: FullOrbitProfile | null = null;
    let socialProfile = null;

    try {
      fullProfile = await deepSearchClient.getFullProfile(id);
    } catch {
      // Not a valid orbit_id or API error
    }

    if (fullProfile) {
      console.error(`Found orbit profile for ${id}`);
      
      if (fullProfile.sendit_id) {
        try {
          socialProfile = await socialClient.getProfileByUserId(fullProfile.sendit_id);
        } catch {
          // Continue without social profile
        }
      }

      combinedProfile = combineProfiles(fullProfile, socialProfile);
    } else {
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

    let format: OutputFormat = 'text';
    if (options.json) {
      format = 'json';
    } else if (options.brief) {
      format = 'brief';
    }

    const section = options.sources ? 'sources' : options.section;
    const output = formatProfile(combinedProfile, format, section);
    console.log(output);
  } catch (error) {
    console.error(formatError(error));
    process.exit(1);
  }
}
