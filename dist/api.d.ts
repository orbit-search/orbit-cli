/**
 * Self-contained Orbit API client. No external MCP server dependency.
 */
import type { ProfileDetails, SearchResult } from "./types.js";
export declare function searchPeople(query: string, numResults?: number): Promise<SearchResult[]>;
export declare function getProfile(userId: string): Promise<ProfileDetails>;
export declare function getMyProfile(): Promise<ProfileDetails>;
export declare function formatProfile(profile: ProfileDetails): string;
export declare function formatProfileBrief(profile: ProfileDetails): string;
//# sourceMappingURL=api.d.ts.map