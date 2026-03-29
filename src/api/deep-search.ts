import type {
  DeepSearchConfig,
  ProfileSearchRequest,
  ProfileSearchResponse,
  FullOrbitProfile,
  TriggerDeepSearchRequest,
  TriggerDeepSearchResponse,
  SearchStatusResponse,
  SearchResponse,
} from './types.js';

export class DeepSearchClient {
  private apiKey: string;
  private host: string;

  constructor(config: DeepSearchConfig) {
    this.apiKey = config.deepSearchApiKey;
    this.host = config.deepSearchHost;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
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

    return response.json() as Promise<T>;
  }

  /**
   * Search stored profiles by name
   */
  async searchProfiles(
    personName: string,
    age?: number
  ): Promise<ProfileSearchResponse> {
    const body: ProfileSearchRequest = { person_name: personName };
    if (age !== undefined) {
      body.age = age;
    }

    return this.request<ProfileSearchResponse>('/v1/people/profiles/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Get full profile by orbit_id
   */
  async getFullProfile(orbitId: string): Promise<FullOrbitProfile> {
    return this.request<FullOrbitProfile>(`/v1/people/profile/orbit/${encodeURIComponent(orbitId)}`);
  }

  /**
   * Trigger a new deep search
   */
  async triggerDeepSearch(
    personName: string,
    options: {
      phone?: string;
      twitterHandle?: string;
    } = {}
  ): Promise<TriggerDeepSearchResponse> {
    const body: TriggerDeepSearchRequest = {
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

    return this.request<TriggerDeepSearchResponse>('/v2/people/search/deep/light', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Get search status
   */
  async getSearchStatus(searchId: string): Promise<SearchStatusResponse> {
    return this.request<SearchStatusResponse>(`/v1/people/search/${encodeURIComponent(searchId)}/status`);
  }

  /**
   * Get search response (results)
   */
  async getSearchResponse(searchId: string): Promise<SearchResponse> {
    return this.request<SearchResponse>(`/v1/people/search/${encodeURIComponent(searchId)}/response`);
  }

  /**
   * Poll until search is complete
   */
  async pollUntilComplete(
    searchId: string,
    onProgress?: (status: SearchStatusResponse) => void,
    maxAttempts = 60,
    delayMs = 5000
  ): Promise<SearchResponse> {
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
