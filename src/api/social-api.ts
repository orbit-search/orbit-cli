import type {
  SocialApiConfig,
  SocialProfileResponse,
  SocialProfile,
  SmartSearchRequest,
  SmartSearchResponse,
} from './types.js';

export class SocialApiClient {
  private host: string;
  private appId: string;
  private appVersion: string;
  private apiKey: string;
  private serviceUserId: string;
  private userApiKey?: string;

  constructor(config: SocialApiConfig & { userApiKey?: string }) {
    this.host = config.socialApiHost;
    this.appId = config.socialApiAppId || '0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d';
    this.appVersion = config.socialApiAppVersion || '1.0.0';
    this.apiKey = config.socialApiKey;
    this.serviceUserId = config.serviceUserId;
    this.userApiKey = config.userApiKey;
  }

  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'App-Id': this.appId,
      'App-Version': this.appVersion,
    };
    // Use user API key (from `orbit login`) if available
    if (this.userApiKey) {
      headers['Authorization'] = `Bearer ${this.userApiKey}`;
    }
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
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

    return response.json() as Promise<T>;
  }

  /**
   * Get profile by userId (UUID/sendit_id)
   */
  async getProfileByUserId(userId: string): Promise<SocialProfile | null> {
    try {
      const response = await this.request<SocialProfileResponse>(
        `/v2/social/profiles/users/${encodeURIComponent(userId)}?sortImagesAsOrbit=true&showFirstOrbit=true`
      );
      return response.payload?.socialProfile || null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get profile by username (e.g., from social media handle)
   */
  async getProfileByUsername(username: string): Promise<SocialProfile | null> {
    try {
      const response = await this.request<SocialProfileResponse>(
        `/v2/social/profiles/usernames/${encodeURIComponent(username)}`
      );
      return response.payload?.socialProfile || null;
    } catch (error) {
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
  async smartSearch(query: string, numUsers = 6): Promise<SmartSearchResponse | null> {
    try {
      const body: SmartSearchRequest = {
        query,
        userId: this.serviceUserId,
        numUsers,
        isManualInput: true,
      };

      const response = await fetch(
        `${this.host}/v2/social/profiles/searches/smart/internal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'App-Id': this.appId,
            'App-Version': this.appVersion,
            'api-key': this.apiKey,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        if (response.status === 500) {
          console.warn('Smart search endpoint unavailable (500) - treating as optional');
          return null;
        }
        const text = await response.text();
        throw new Error(`Smart search error (${response.status}): ${text}`);
      }

      return response.json() as Promise<SmartSearchResponse>;
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`Smart search failed: ${error.message}`);
      }
      return null;
    }
  }
}
