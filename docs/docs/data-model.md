---
sidebar_position: 10
---

# Data Model

Every Orbit profile is a structured representation of a person built from public web sources. Here's what each field contains.

## ProfileDetails

The top-level object returned by `orbit profile --json`:

```typescript
{
  userId: string;              // UUID identifier
  displayName: string | null;  // Full name
  username: string | null;     // Orbit username
  photoUrl: string | null;     // Default profile photo URL
  link: string | null;         // Orbit profile URL
  location: string | null;     // Current city
  birthday: string | null;     // Birthday (YYYY-MM-DD or descriptive)
  age: number | null;          // Age in years
  verified: boolean;           // Orbit verified status
  generationLevel: number;     // Profile generation depth

  bio: string | null;          // AI-generated summary
  bioSources: SourceLink[];    // Sources for the bio

  skills: string[];            // Technical/professional skills
  previousLocations: string[]; // Historical locations

  jobs: BioSectionItem[];              // Work history
  jobSources: SourceLink[];
  education: BioSectionItem[];         // Schools
  educationSources: SourceLink[];
  accomplishments: BioSectionItem[];   // Achievements
  accomplishmentSources: SourceLink[];
  controversies: BioSectionItem[];     // Public controversies
  controversySources: SourceLink[];
  bestQualities: BioSectionItem[];     // Positive traits
  netWorth: BioSectionItem[];          // Net worth info

  worldview: {
    politics?: string;
    religion?: string;
    causes?: string;
  } | null;

  passions: PassionDetail[];    // Interests and hobbies
  personalLife: string[];       // Personal background flags
  greenFlags: string[];         // Positive signals
  redFlags: string[];           // Warning signals
  loveLanguage: string[];       // Love language info
  starSign: string[];           // Astrological sign

  socialLinks: { media: string; handle: string }[];

  orbitFirstDegree: {
    senditId: string;
    fullName: string;
    avatarUrl: string | null;
    link: string;
  }[];

  orbitSources: { url: string; name: string }[];
}
```

## BioSectionItem

Used for jobs, education, accomplishments, controversies, and qualities:

```typescript
{
  text: string;          // Primary text (company name, school, achievement)
  years?: string;        // Date range (e.g. "2020-Present")
  title?: string;        // Job title
  description?: string;  // Role description
  readMore?: string;     // Extended narrative (truncated to 500 chars)
  imageUrl?: string;     // Company/school logo
}
```

## PassionDetail

```typescript
{
  name: string;          // Passion name
  description?: string;  // Short description
  detail?: string;       // Detailed description
  emoji?: string;        // Associated emoji
}
```

## SourceLink

```typescript
{
  name: string;  // Source name or domain
  url: string;   // Full URL
}
```

## SearchResult

Returned by `orbit search --json`:

```typescript
{
  userId: string;           // UUID — use with orbit profile
  displayName: string;      // Person's name
  age: number | null;       // Age if known
  city: string | null;      // Location if known
  matchReason: string|null; // Why this person matched
}
```

## Data Coverage

Not every profile has all fields. Coverage depends on:

- **Public footprint** — more web presence = richer profile
- **Source availability** — LinkedIn, social media, news, public records
- **Profile generation** — profiles are AI-generated from discovered sources

Common patterns:
- Most profiles have: name, location, bio, work history, social links
- Many profiles have: education, accomplishments, passions, connections
- Some profiles have: controversies, worldview, net worth, love language, star sign
