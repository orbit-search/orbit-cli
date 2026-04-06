---
sidebar_position: 1
---

# API Overview

The Orbit API provides programmatic access to people search and profile data. All endpoints return JSON.

## Base URL

```
https://api.orbitsearch.com
```

## Required Headers

Every request must include:

| Header | Value |
|---|---|
| `App-Id` | `0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d` |
| `App-Version` | `1.0.0` |
| `Content-Type` | `application/json` |

## Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/v2/social/profiles/searches/smart/sse` | Search for people (SSE) | Yes |
| `GET` | `/v2/social/profiles/users/{userId}` | Get full profile | No |
| `GET` | `/v1/profile` | Get authenticated user's basic info | Yes |

## Response Format

All responses follow this structure:

```json
{
  "status": "success",
  "payload": {
    // response data
  }
}
```

## Rate Limits

Be respectful of the API. There are no published rate limits, but excessive requests may be throttled.

## Errors

| Status | Meaning |
|---|---|
| 400 | Bad request — check your parameters |
| 401 | Unauthorized — missing or invalid API key |
| 403 | Forbidden — API key doesn't have access |
| 404 | Not found — user ID doesn't exist |
| 429 | Rate limited — slow down |
| 500 | Server error |
