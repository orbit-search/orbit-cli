/**
 * Shared types for Orbit APIs
 */

// ============================================================================
// Deep Search API Types
// ============================================================================

export interface DeepSearchConfig {
  deepSearchApiKey: string;
  deepSearchHost: string;
}

export interface ProfileSearchRequest {
  person_name: string;
  age?: number;
}

export interface ProfileSearchResponse {
  success: boolean;
  profiles: DeepSearchProfile[];
}

export interface DeepSearchProfile {
  orbit_id: string;
  name: string;
  age?: number;
  location?: string;
  mobile_phone?: string;
  email?: string;
  sendit_id?: string;
  [key: string]: unknown;
}

export interface FullOrbitProfile {
  orbit_id: string;
  person_name?: string;
  display_name?: string;
  name?: string;
  age?: number;
  location?: string | Record<string, unknown>;
  city?: string;
  state?: string;
  jobs?: Array<{
    title?: string;
    company?: string;
    years?: string;
  }>;
  schools?: Array<{
    name?: string;
    years?: string;
  }>;
  fun_facts?: string[];
  social_profiles?: Array<{
    platform?: string;
    url?: string;
  }>;
  search_engine_results?: Array<{
    title?: string;
    link?: string;
  }>;
  phone_numbers?: string[];
  email_addresses?: string[];
  historical_addresses?: string[];
  linkedin_profile_url?: string;
  sendit_id?: string;
  [key: string]: unknown;
}

export interface TriggerDeepSearchRequest {
  person_name: string;
  phone?: string;
  level2_urls?: string[];
  origin: string;
  is_sync_mode: boolean;
  do_enrich: boolean;
}

export interface TriggerDeepSearchResponse {
  search_id: string;
  job_id: string;
}

export interface SearchStatusResponse {
  status: string;
  progress?: number;
  [key: string]: unknown;
}

export interface SearchResponse {
  profiles?: DeepSearchProfile[];
  [key: string]: unknown;
}

// ============================================================================
// Social API Types
// ============================================================================

export interface SocialApiConfig {
  socialApiHost: string;
  socialApiAppId: string;
  socialApiAppVersion: string;
  socialApiKey: string;
  serviceUserId: string;
}

export interface SocialProfileResponse {
  status: string;
  payload: {
    socialProfile?: SocialProfile;
    orbitFirstDegree?: OrbitFirstDegree;
  };
}

export interface SocialProfile {
  userId: string;
  aiRating?: AIRating;
  socialMediaHandles?: SocialMediaHandle[];
  orbitSources?: OrbitSource[];
}

export interface AIRating {
  bio?: string;
  basic?: {
    birthday?: string;
    location?: string;
  };
  jobs?: {
    jobs?: Array<{
      name: string;
      extData?: {
        years?: string;
      };
    }>;
  };
  education?: {
    educations?: Array<{
      name: string;
      extData?: {
        years?: string;
      };
    }>;
  };
  accomplishments?: {
    accomplishments?: Array<{
      name: string;
      reason?: string;
    }>;
  };
  controversies?: {
    controversies?: Array<{
      name: string;
      reason?: string;
    }>;
  };
  bestQualities?: {
    qualities?: Array<{
      name: string;
    }>;
  };
  netWorth?: {
    netWorth?: Array<{
      name: string;
    }>;
  };
  greenFlagsV2?: {
    flags: Record<string, unknown>;
  };
  redFlagsV2?: {
    flags: Record<string, unknown>;
  };
  personalLife?: {
    flags: Record<string, unknown>;
  };
  worldview?: {
    politics?: string;
    religion?: string;
    causes?: string;
  };
  passions?: Array<{
    passion: string;
    description?: string;
  }>;
}

export interface SocialMediaHandle {
  media: string;
  handle: string;
}

export interface OrbitSource {
  link: string;
  title?: string;
  sourceName?: string;
}

export interface OrbitFirstDegree {
  users?: Array<{
    senditId: string;
    fullName: string;
  }>;
}

export interface SmartSearchRequest {
  query: string;
  userId: string;
  numUsers: number;
  isManualInput: boolean;
}

export interface SmartSearchResponse {
  status: string;
  payload?: {
    users?: Array<{
      userId: string;
      matchReason?: string;
    }>;
  };
}

// ============================================================================
// Combined/Shared Types
// ============================================================================

export interface CombinedProfile {
  orbitId?: string;
  senditId?: string;
  name: string;
  age?: number;
  location?: string;
  bio?: string;
  jobs?: Array<{
    name: string;
    years?: string;
  }>;
  education?: Array<{
    name: string;
    years?: string;
  }>;
  socialHandles?: SocialMediaHandle[];
  sources?: OrbitSource[];
  accomplishments?: Array<{
    name: string;
    reason?: string;
  }>;
  controversies?: Array<{
    name: string;
    reason?: string;
  }>;
  bestQualities?: Array<{
    name: string;
  }>;
  worldview?: AIRating['worldview'];
  passions?: AIRating['passions'];
  rawDeepSearch?: DeepSearchProfile | FullOrbitProfile;
  rawSocial?: SocialProfile;
}

export interface AppConfig extends DeepSearchConfig, SocialApiConfig {
  apiKey?: string; // User API key from `orbit login` (sk_orb_...)
}

export type OutputFormat = 'text' | 'json' | 'brief';
