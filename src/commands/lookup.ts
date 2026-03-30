import { searchPeople, getProfile, formatProfile, formatProfileBrief } from "../api.js";

export interface LookupOptions {
  json?: boolean;
  brief?: boolean;
}

export async function lookupCommand(query: string, options: LookupOptions): Promise<void> {
  try {
    const results = await searchPeople(query, 1);

    if (results.length === 0) {
      console.log(`No results found for "${query}".`);
      process.exit(1);
    }

    const top = results[0];
    const profile = await getProfile(top.userId);

    if (options.json) {
      console.log(JSON.stringify({ ...profile, matchReason: top.matchReason }, null, 2));
    } else if (options.brief) {
      console.log(formatProfileBrief(profile));
    } else {
      console.log(formatProfile(profile));
    }
  } catch (error) {
    console.error(`Lookup failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
