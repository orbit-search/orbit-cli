import type { DeepSearchConfig, ProfileSearchResponse, FullOrbitProfile, TriggerDeepSearchResponse, SearchStatusResponse, SearchResponse } from './types.js';
export declare class DeepSearchClient {
    private apiKey;
    private host;
    constructor(config: DeepSearchConfig);
    private request;
    /**
     * Search stored profiles by name
     */
    searchProfiles(personName: string, age?: number): Promise<ProfileSearchResponse>;
    /**
     * Get full profile by orbit_id
     */
    getFullProfile(orbitId: string): Promise<FullOrbitProfile>;
    /**
     * Trigger a new deep search
     */
    triggerDeepSearch(personName: string, options?: {
        phone?: string;
        twitterHandle?: string;
    }): Promise<TriggerDeepSearchResponse>;
    /**
     * Get search status
     */
    getSearchStatus(searchId: string): Promise<SearchStatusResponse>;
    /**
     * Get search response (results)
     */
    getSearchResponse(searchId: string): Promise<SearchResponse>;
    /**
     * Poll until search is complete
     */
    pollUntilComplete(searchId: string, onProgress?: (status: SearchStatusResponse) => void, maxAttempts?: number, delayMs?: number): Promise<SearchResponse>;
}
//# sourceMappingURL=deep-search.d.ts.map