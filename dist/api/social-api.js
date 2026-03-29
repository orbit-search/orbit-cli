export class SocialApiClient {
    host;
    appId;
    appVersion;
    apiKey;
    serviceUserId;
    constructor(config) {
        this.host = config.socialApiHost;
        this.appId = config.socialApiAppId;
        this.appVersion = config.socialApiAppVersion;
        this.apiKey = config.socialApiKey;
        this.serviceUserId = config.serviceUserId;
    }
    getDefaultHeaders() {
        return {
            'Content-Type': 'application/json',
            'app-id': this.appId,
            'app-version': this.appVersion,
        };
    }
    async request(endpoint, options = {}) {
        const url = `${this.host}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getDefaultHeaders(),
                ...options.headers,
            },
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Social API error (${response.status}): ${text}`);
        }
        return response.json();
    }
    /**
     * Get profile by userId (UUID/sendit_id)
     */
    async getProfileByUserId(userId) {
        try {
            const response = await this.request(`/v2/social/profiles/users/${encodeURIComponent(userId)}?sortImagesAsOrbit=true&showFirstOrbit=true`);
            return response.payload?.socialProfile || null;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get profile by username (e.g., from social media handle)
     */
    async getProfileByUsername(username) {
        try {
            const response = await this.request(`/v2/social/profiles/usernames/${encodeURIComponent(username)}`);
            return response.payload?.socialProfile || null;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Smart search with natural language query
     * NOTE: This endpoint may return 500 due to server-side issues - handle gracefully
     */
    async smartSearch(query, numUsers = 6) {
        try {
            const body = {
                query,
                userId: this.serviceUserId,
                numUsers,
                isManualInput: true,
            };
            const response = await fetch(`${this.host}/v2/social/profiles/searches/smart/internal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'App-Id': this.appId,
                    'App-Version': this.appVersion,
                    'api-key': this.apiKey,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                if (response.status === 500) {
                    console.warn('Smart search endpoint unavailable (500) - treating as optional');
                    return null;
                }
                const text = await response.text();
                throw new Error(`Smart search error (${response.status}): ${text}`);
            }
            return response.json();
        }
        catch (error) {
            if (error instanceof Error) {
                console.warn(`Smart search failed: ${error.message}`);
            }
            return null;
        }
    }
}
//# sourceMappingURL=social-api.js.map