---
sidebar_position: 4
---

# Profiles API

Get a full profile for any person by user ID.

## Endpoint

```
GET /v2/social/profiles/users/{userId}?sortImagesAsOrbit=true&showFirstOrbit=true
```

**No authentication required.**

## Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `userId` | string | UUID of the person |

## Query Parameters

| Parameter | Value | Description |
|---|---|---|
| `sortImagesAsOrbit` | `true` | Sort images in Orbit display order |
| `showFirstOrbit` | `true` | Include first-degree connections |

## Response

```json
{
  "status": "success",
  "payload": {
    "userId": "a7b7449d-3b89-4bf1-95fc-183e831f31cc",
    "orbitId": "nicholas-dominici286",
    "socialProfile": {
      "id": "...",
      "displayName": "Nicholas Vinicius Dominici",
      "avatarUrl": "https://...",
      "username": "...",
      "verified": false,
      "link": "https://orbitsearch.com/nicholas-dominici286",
      "location": { "city": "Santa Monica, CA" },
      "socialMediaHandles": [...],
      "widgets": [...],
      "orbitSources": [...],
      "aiRating": {
        "bio": "Currently based in Santa Monica...",
        "bioV2": { "bio": "...", "sources": {...} },
        "basic": { "birthday": "23 years old, born December 1, 2002", "location": "Santa Monica, CA" },
        "jobs": { "jobs": [...], "sources": [...] },
        "education": { "educations": [...], "sources": [...] },
        "accomplishments": { "accomplishments": [...], "sources": [...] },
        "controversies": { "controversies": [...], "sources": [...] },
        "bestQualities": { "qualities": [...], "sources": [...] },
        "passions": [...],
        "personalLife": { "bio": "...", "flags": {...} },
        "worldview": { "politics": "...", "religion": "...", "causes": "..." }
      },
      "orbitFirstDegree": {
        "users": [...],
        "total": 50
      }
    }
  }
}
```

## Key Response Sections

### `aiRating`

The AI-generated analysis of the person. This is where most structured data lives.

| Field | Type | Description |
|---|---|---|
| `bio` | string | Short bio summary |
| `bioV2` | object | Bio with source citations |
| `basic` | object | Birthday, location |
| `jobs.jobs` | array | Work history |
| `education.educations` | array | Schools |
| `accomplishments.accomplishments` | array | Achievements |
| `controversies.controversies` | array | Public controversies |
| `bestQualities.qualities` | array | Positive traits |
| `passions` | array | Interests with descriptions |
| `personalLife` | object | Background, flags |
| `worldview` | object | Politics, religion, causes |

### `jobs` / `accomplishments` / etc.

Each section has an `items` array and a `sources` array. Each item:

```json
{
  "id": "...",
  "name": "Orbit Intelligence",
  "bioType": "JOB",
  "extData": {
    "years": "2026-Present",
    "jobTitle": "...",
    "jobDescription": "...",
    "readMore": {
      "sections": [{ "title": "Overview", "content": "..." }]
    }
  }
}
```

### `socialMediaHandles`

```json
[
  { "media": "linkedin", "handle": "nicholas-dominici-110b4a178" },
  { "media": "github", "handle": "NicholasDominici" },
  { "media": "snapchat", "handle": "nick-dominici" }
]
```

### `orbitFirstDegree`

```json
{
  "users": [
    {
      "senditId": "00a08c0e-e773-4f11-88bf-fd3092ecc721",
      "fullName": "Garrison R Magyar",
      "avatarUrl": null,
      "orbitId": null
    }
  ],
  "total": 50
}
```

### `orbitSources`

Web sources the profile was built from:

```json
[
  {
    "link": "https://grokipedia.com/page/Nicholas_Dominici",
    "title": "Nicholas Dominici - Grokipedia",
    "sourceName": "grokipedia.com"
  }
]
```

## Example

```bash
curl "https://api.orbitsearch.com/v2/social/profiles/users/a7b7449d-3b89-4bf1-95fc-183e831f31cc?sortImagesAsOrbit=true&showFirstOrbit=true" \
  -H "App-Id: 0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d" \
  -H "App-Version: 1.0.0"
```

## Get Authenticated User

```
GET /v1/profile
```

**Requires authentication.** Returns the authenticated user's basic info including their `userId`, which you can then use with the profile endpoint above.

```json
{
  "status": "success",
  "payload": {
    "user": {
      "id": "a7b7449d-3b89-4bf1-95fc-183e831f31cc",
      "display_name": "Nicholas Dominici",
      "avatar_url": "https://..."
    }
  }
}
```
