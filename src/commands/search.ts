import { searchPeople, getProfile, formatProfile } from "../api.js";

export interface SearchOptions {
  json?: boolean;
}

export async function searchCommand(query: string, options: SearchOptions): Promise<void> {
  try {
    const users = await searchPeople(query);

    if (users.size === 0) {
      console.log(`No results found for "${query}".`);
      return;
    }

    const profiles = await Promise.allSettled(
      [...users.entries()].map(async ([userId, user]) => {
        const profile = await getProfile(userId);
        return { ...profile, matchReason: user.matchReason ?? null };
      })
    );

    const results = profiles
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const profile of results) {
        console.log(formatProfile(profile));
        if (profile.matchReason) {
          console.log(`\n  💡 Match: ${profile.matchReason}`);
        }
        console.log("");
      }
      console.log(`Found ${results.length} result${results.length === 1 ? "" : "s"} for "${query}".`);
    }
  } catch (error) {
    console.error(`Search failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
