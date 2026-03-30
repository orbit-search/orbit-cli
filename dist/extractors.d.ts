import type { ApiSocialProfile, ApiOrbitFirstDegree, ProfileDetails } from "./types.js";
export declare function parseApiResponse(response: unknown): {
    socialProfile: ApiSocialProfile;
    orbitFirstDegree?: ApiOrbitFirstDegree;
};
export declare function extractDetailedProfile(profile: ApiSocialProfile, orbitFirstDegree: ApiOrbitFirstDegree | undefined, userId: string): ProfileDetails;
//# sourceMappingURL=extractors.d.ts.map