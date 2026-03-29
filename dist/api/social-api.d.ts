import type { SocialApiConfig, SocialProfile, SmartSearchResponse } from './types.js';
export declare class SocialApiClient {
    private host;
    private appId;
    private appVersion;
    private apiKey;
    private serviceUserId;
    private userApiKey?;
    constructor(config: SocialApiConfig & {
        userApiKey?: string;
    });
    private getDefaultHeaders;
    private request;
    /**
     * Get profile by userId (UUID/sendit_id)
     */
    getProfileByUserId(userId: string): Promise<SocialProfile | null>;
    /**
     * Get profile by username (e.g., from social media handle)
     */
    getProfileByUsername(username: string): Promise<SocialProfile | null>;
    /**
     * Smart search with natural language query
     * NOTE: This endpoint may return 500 due to server-side issues - handle gracefully
     */
    smartSearch(query: string, numUsers?: number): Promise<SmartSearchResponse | null>;
}
//# sourceMappingURL=social-api.d.ts.map