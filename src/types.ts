// ── Generic helpers ──────────────────────────────────────────────

export type JsonRecord = Record<string, unknown>;

// ── API response types ──────────────────────────────────────────

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
  generationLevel?: number;
  verified?: boolean;
  link: string;
  location?: { city: string; timezone: string };
  socialMediaHandles: ApiSocialMediaHandle[];
  widgets: ApiWidget[];
  orbitSources: ApiOrbitSource[];
  aiRating: ApiAiRating;
  orbitFirstDegree?: ApiOrbitFirstDegree;
};

export type ApiAiRating = {
  aiBioVersion?: string;
  bio?: string;
  bioV2?: { bio?: string; sources?: unknown };
  basic?: {
    birthday?: string;
    location?: string;
    sources?: unknown;
  };
  personalLife?: ApiFlagsSection;
  greenFlagsV2?: ApiFlagsSection;
  redFlagsV2?: ApiFlagsSection;
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
  profileSearchSuggestions?: unknown[];
};

export type ApiFlagsSection = {
  bio: string;
  flags: Record<string, string>;
  sources?: unknown;
  pictures?: unknown;
  updatedAt?: string;
};

export type ApiBioSectionListItem = {
  id: string;
  name: string;
  bioType: string;
  imageUrl?: string;
  extData?: {
    years?: string;
    jobTitle?: string;
    jobDescription?: string;
    estimatedSalary?: string;
    companyRecordId?: string;
    backgroundImageUrl?: string;
    schoolId?: string;
    readMore?: {
      promptVersion?: string;
      sections?: { title?: string; content?: string }[];
    };
  };
  reason?: string;
};

export type ApiPassionItem = {
  id: string;
  passion: string;
  description?: string;
  detail?: string;
  position?: number;
  emoji?: string;
  sources?: unknown[];
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
  id?: string;
  type: string;
  data?: {
    answer?: string;
    question?: string;
    type?: string;
    sources?: { id?: string; link?: string; name?: string }[];
  } | Array<{ answer?: string; question?: string; detectedCountry?: string; detectedLocation?: string; detectedRegion?: string }>;
  priority?: number;
  highlight?: boolean;
  hide?: boolean;
  labels?: string[];
  aiScore?: number;
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

// ── Search types ────────────────────────────────────────────────

export type SearchUser = {
  userId: string;
  matchReason?: string;
};

// ── Extracted profile types ─────────────────────────────────────

export type BioSectionItem = {
  text: string;
  years?: string;
  title?: string;
  description?: string;
  readMore?: string;
  imageUrl?: string;
};

export type PassionDetail = {
  name: string;
  description?: string;
  detail?: string;
  emoji?: string;
};

export type SourceLink = { name: string; url: string };

export type ProfileDetails = {
  userId: string;
  displayName: string | null;
  username: string | null;
  photoUrl: string | null;
  link: string | null;
  location: string | null;
  birthday: string | null;
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
  jobSources: SourceLink[];
  education: BioSectionItem[];
  educationSources: SourceLink[];
  accomplishments: BioSectionItem[];
  accomplishmentSources: SourceLink[];
  controversies: BioSectionItem[];
  controversySources: SourceLink[];
  bestQualities: BioSectionItem[];
  netWorth: BioSectionItem[];
  worldview: { politics?: string; religion?: string; causes?: string } | null;
  passions: PassionDetail[];
  bioSources: SourceLink[];
  socialLinks: { media: string; handle: string }[];
  orbitFirstDegree: { senditId: string; fullName: string; avatarUrl: string | null; link: string }[];
  orbitSources: { url: string; name: string }[];
  skills: string[];
  previousLocations: string[];
};
