/**
 * Output formatting utilities for token-efficient display
 */
import type { CombinedProfile, DeepSearchProfile, FullOrbitProfile, SocialProfile, OutputFormat } from '../api/types.js';
/**
 * Format a profile for display based on the requested format
 */
export declare function formatProfile(profile: CombinedProfile, format: OutputFormat, section?: string): string;
/**
 * Format multiple profiles for display
 */
export declare function formatProfiles(profiles: CombinedProfile[], format: OutputFormat): string;
/**
 * Combine Deep Search and Social profiles into a unified structure
 */
export declare function combineProfiles(deepSearchProfile: DeepSearchProfile | FullOrbitProfile | null, socialProfile: SocialProfile | null): CombinedProfile;
/**
 * Format error message
 */
export declare function formatError(error: unknown): string;
/**
 * Format success message
 */
export declare function formatSuccess(message: string): string;
//# sourceMappingURL=formatter.d.ts.map