// ── Generic helpers ──────────────────────────────────────────────

export type JsonRecord = Record<string, unknown>;

// ── API response types (GET /v2/social/profiles/users/:userId) ──

export type ApiProfileResponse = {
  status: string;
  payload: {
    userId: string;
    orbitId?: string;
    socialProfile: ApiSocialProfile;
    orbitFirstDegree?: ApiOrbitFirstDegree;
  };
};

export type ApiSocialProfile = {
  id: string;
  displayName: string;
  avatarUrl: string;
  username: string;
  link: string;
  verified?: boolean;
  generationLevel?: number;
  location?: { city: string; timezone: string };
  socialMediaHandles: ApiSocialMediaHandle[];
  widgets: ApiWidget[];
  orbitSources: ApiOrbitSource[];
  aiRating: ApiAiRating;
};

export type ApiAiRating = {
  bio?: string;
  basic?: {
    birthday?: string;
    school?: string;
    location?: string;
  };
  greenFlagsV2?: ApiFlagsSection;
  redFlagsV2?: ApiFlagsSection;
  personalLife?: ApiFlagsSection;
  loveLanguage?: ApiFlagsSection;
  starSign?: ApiFlagsSection;
  jobs?: { jobs: ApiBioSectionListItem[]; sources?: unknown[] };
  education?: { educations: ApiBioSectionListItem[]; sources?: unknown[] };
  accomplishments?: { accomplishments: ApiBioSectionListItem[]; sources?: unknown[] };
  controversies?: { controversies: ApiBioSectionListItem[]; sources?: unknown[] };
  bestQualities?: { qualities: ApiBioSectionListItem[]; sources?: unknown[] };
  netWorth?: { netWorth: ApiBioSectionListItem[]; sources?: unknown[] };
  worldview?: { politics?: string; religion?: string; causes?: string; sources?: unknown[] };
  passions?: ApiPassionItem[];
};

export type ApiFlagsSection = {
  bio: string;
  flags: Record<string, string>;
  sources?: unknown;
  updatedAt?: string;
};

export type ApiBioSectionListItem = {
  id: string;
  name: string;
  bioType: string;
  imageUrl?: string;
  extData?: {
    years?: string;
    backgroundImageUrl?: string;
    schoolId?: string;
  };
  reason?: string;
};

export type ApiPassionItem = {
  id: string;
  passion: string;
  description?: string;
  detail?: unknown;
  position?: number;
  emoji?: string;
};

export type ApiSocialMediaHandle = {
  id: string;
  media: string;
  handle: string;
  description?: string;
  icon?: string;
  priority?: number;
};

export type ApiWidget = {
  type: string;
  data?: { answer?: string; type?: string };
};

export type ApiOrbitSource = {
  id: string;
  link: string;
  title: string;
  summary?: string;
  sourceImage?: string;
  sourceName?: string;
  priority?: number;
};

export type ApiOrbitFirstDegree = {
  users: {
    senditId: string;
    orbitId: string | null;
    fullName: string;
    avatarUrl: string | null;
  }[];
  total: number;
};

// ── Search API response (POST /v2/social/profiles/searches/smart/internal) ──

export type SearchUser = {
  userId: string;
  matchReason?: string;
};

// ── Widget output types (what we send to the widget) ────────────

export type BioSectionItem = {
  text: string;
  years?: string;
};

export type ProfileDetails = {
  userId: string;
  displayName: string | null;
  username: string | null;
  photoUrl: string | null;
  link: string | null;
  location: string | null;
  age: number | null;
  verified: boolean;
  generationLevel: number | null;
  bio: string | null;
  greenFlags: string[];
  redFlags: string[];
  personalLife: string[];
  loveLanguage: string[];
  starSign: string[];
  jobs: BioSectionItem[];
  education: BioSectionItem[];
  accomplishments: BioSectionItem[];
  controversies: BioSectionItem[];
  bestQualities: BioSectionItem[];
  netWorth: BioSectionItem[];
  worldview: { politics?: string; religion?: string; causes?: string } | null;
  passions: string[];
  socialLinks: { media: string; handle: string }[];
  orbitFirstDegree: { senditId: string; fullName: string; avatarUrl: string | null; link: string }[];
  orbitSources: { url: string; name: string }[];
};
