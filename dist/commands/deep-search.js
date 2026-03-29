import { DeepSearchClient } from '../api/deep-search.js';
import { loadConfig, getDeepSearchConfig } from '../utils/config.js';
import { formatError, formatSuccess } from '../utils/formatter.js';
export async function deepSearchCommand(name, options) {
    try {
        const config = loadConfig();
        const client = new DeepSearchClient(getDeepSearchConfig(config));
        console.error(`Triggering deep search for "${name}"...`);
        const result = await client.triggerDeepSearch(name, {
            phone: options.phone,
            twitterHandle: options.twitter,
        });
        console.error(formatSuccess(`Search initiated`));
        console.error(`  Search ID: ${result.search_id}`);
        console.error(`  Job ID: ${result.job_id}`);
        if (options.wait) {
            console.error('');
            console.error('Waiting for search to complete (this may take several minutes)...');
            const searchResult = await client.pollUntilComplete(result.search_id, (status) => {
                const progress = status.progress !== undefined ? ` (${Math.round(status.progress * 100)}%)` : '';
                console.error(`  Status: ${status.status}${progress}`);
            });
            console.error('');
            console.error(formatSuccess('Search completed!'));
            if (searchResult.profiles && searchResult.profiles.length > 0) {
                console.error(`Found ${searchResult.profiles.length} profile(s)`);
                console.log(JSON.stringify(searchResult.profiles, null, 2));
            }
            else {
                console.log(JSON.stringify(searchResult, null, 2));
            }
        }
        else {
            console.log(JSON.stringify(result, null, 2));
        }
    }
    catch (error) {
        console.error(formatError(error));
        process.exit(1);
    }
}
//# sourceMappingURL=deep-search.js.map