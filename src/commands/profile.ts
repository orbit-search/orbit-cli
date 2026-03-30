import { getProfile, formatProfile } from "../api.js";

export interface ProfileOptions {
  json?: boolean;
}

export async function profileCommand(userId: string, options: ProfileOptions): Promise<void> {
  try {
    const profile = await getProfile(userId);

    if (options.json) {
      console.log(JSON.stringify(profile, null, 2));
    } else {
      console.log(formatProfile(profile));
    }
  } catch (error) {
    console.error(`Profile fetch failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
