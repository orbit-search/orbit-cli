/**
 * Self-contained Orbit API client. No external MCP server dependency.
 */
import type { OrbitConfig } from "./utils/config.js";
import type { ProfileDetails, SearchResult } from "./types.js";
export declare function searchPeople(query: string, numResults?: number): Promise<SearchResult[]>;
export declare function getRawProfile(profileId: string, config?: OrbitConfig): Promise<unknown>;
export declare function getProfile(profileId: string, config?: OrbitConfig): Promise<ProfileDetails>;
export declare function getMyProfile(): Promise<ProfileDetails>;
export declare function formatProfile(profile: ProfileDetails): string;
export declare function formatProfileBrief(profile: ProfileDetails): string;
//# sourceMappingURL=api.d.ts.map