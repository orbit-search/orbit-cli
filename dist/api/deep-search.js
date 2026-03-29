export class DeepSearchClient {
    apiKey;
    host;
    constructor(config) {
        this.apiKey = config.deepSearchApiKey;
        this.host = config.deepSearchHost;
    }
    async request(endpoint, options = {}) {
        const url = `${this.host}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                ...options.headers,
            },
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Deep Search API error (${response.status}): ${text}`);
        }
        return response.json();
    }
    /**
     * Search stored profiles by name
     */
    async searchProfiles(personName, age) {
        const body = { person_name: personName };
        if (age !== undefined) {
            body.age = age;
        }
        return this.request('/v1/people/profiles/search', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
    /**
     * Get full profile by orbit_id
     */
    async getFullProfile(orbitId) {
        return this.request(`/v1/people/profile/orbit/${encodeURIComponent(orbitId)}`);
    }
    /**
     * Trigger a new deep search
     */
    async triggerDeepSearch(personName, options = {}) {
        const body = {
            person_name: personName,
            origin: 'cli',
            is_sync_mode: false,
            do_enrich: true,
        };
        if (options.phone) {
            body.phone = options.phone;
        }
        if (options.twitterHandle) {
            body.level2_urls = [`https://x.com/${options.twitterHandle.replace(/^@/, '')}`];
        }
        return this.request('/v2/people/search/deep/light', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
    /**
     * Get search status
     */
    async getSearchStatus(searchId) {
        return this.request(`/v1/people/search/${encodeURIComponent(searchId)}/status`);
    }
    /**
     * Get search response (results)
     */
    async getSearchResponse(searchId) {
        return this.request(`/v1/people/search/${encodeURIComponent(searchId)}/response`);
    }
    /**
     * Poll until search is complete
     */
    async pollUntilComplete(searchId, onProgress, maxAttempts = 60, delayMs = 5000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const status = await this.getSearchStatus(searchId);
            if (onProgress) {
                onProgress(status);
            }
            if (status.status === 'completed' || status.status === 'done') {
                return this.getSearchResponse(searchId);
            }
            if (status.status === 'failed' || status.status === 'error') {
                throw new Error(`Search failed: ${status.status}`);
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        throw new Error(`Search timed out after ${maxAttempts} attempts`);
    }
}
//# sourceMappingURL=deep-search.js.map