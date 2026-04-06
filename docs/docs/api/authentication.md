---
sidebar_position: 2
---

# API Authentication

## API Keys

Orbit uses API keys for authentication. Keys start with `sk_orb_`.

Pass the key as a Bearer token:

```
Authorization: Bearer sk_orb_your_key_here
```

## Getting a Key

1. Sign in at [orbitsearch.com](https://orbitsearch.com)
2. Go to Settings → API Keys
3. Create a new key

Or use the CLI:

```bash
orbit login
```

## Which Endpoints Need Auth?

| Endpoint | Auth Required |
|---|---|
| Search (SSE) | Yes |
| Get Profile | No |
| Get My Profile | Yes |

Profile lookups by user ID don't require authentication. Search and "me" endpoints do.

## Example: Authenticated Request

```bash
curl -X POST https://api.orbitsearch.com/v2/social/profiles/searches/smart/sse \
  -H "App-Id: 0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d" \
  -H "App-Version: 1.0.0" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_orb_your_key_here" \
  -d '{"query": "Sam Altman", "numUsers": 6, "isManualInput": true}'
```

## Example: Unauthenticated Request

```bash
curl "https://api.orbitsearch.com/v2/social/profiles/users/a7b7449d-3b89-4bf1-95fc-183e831f31cc?sortImagesAsOrbit=true&showFirstOrbit=true" \
  -H "App-Id: 0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d" \
  -H "App-Version: 1.0.0"
```
