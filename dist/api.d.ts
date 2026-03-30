/**
 * Self-contained Orbit API client. No external MCP server dependency.
 */
import type { ProfileDetails, SearchUser } from "./types.js";
export declare function searchPeople(query: string, numResults?: number): Promise<Map<string, SearchUser>>;
export declare function getProfile(userId: string): Promise<ProfileDetails>;
export declare function getMyProfile(): Promise<ProfileDetails>;
export declare function formatProfile(profile: ProfileDetails): string;
//# sourceMappingURL=api.d.ts.map