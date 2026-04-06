---
sidebar_position: 3
---

# Search API

Search for people using natural language queries. Returns results via Server-Sent Events (SSE).

## Endpoint

```
POST /v2/social/profiles/searches/smart/sse
```

**Requires authentication.**

## Request Body

```json
{
  "query": "engineers at Stripe",
  "numUsers": 6,
  "isManualInput": true
}
```

| Field | Type | Description |
|---|---|---|
| `query` | string | Natural language search query |
| `numUsers` | number | Max results to return (default: 6) |
| `isManualInput` | boolean | Set to `true` |

## Response

The response is a stream of Server-Sent Events. Two event types:

### `initial` event

Fired first with the initial set of users:

```
event: initial
data: {"status":"success","payload":{"users":[...]}}
```

Each user in the array:

```json
{
  "userId": "9974d324-1227-48c4-bce1-5cf7ec4f3a9d",
  "displayName": "Sam Altman",
  "age": null,
  "city": "United States",
  "matchReason": null
}
```

### `update` event

Fired as match reasons are computed:

```
event: update
data: {"userId":"9974d324-...","matchReason":"CEO of OpenAI and former Y Combinator president."}
```

## Fields

| Field | Type | Description |
|---|---|---|
| `userId` | string | UUID — use with the profile endpoint |
| `displayName` | string | Person's name |
| `age` | number \| null | Age if known |
| `city` | string \| null | City/location if known |
| `matchReason` | string \| null | Why this person matched the query |

## Example

```bash
curl -X POST https://api.orbitsearch.com/v2/social/profiles/searches/smart/sse \
  -H "App-Id: 0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d" \
  -H "App-Version: 1.0.0" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_orb_your_key" \
  -d '{"query": "dentists in Miami", "numUsers": 3, "isManualInput": true}'
```

## Notes

- Search is natural language — not just name matching
- Results include people matching by name, profession, company, location, interests, or any combination
- The SSE stream may take several seconds to complete for complex queries
- Match reasons are computed asynchronously and arrive via `update` events
