---
sidebar_position: 3
---

# Agent & AI Integration

Orbit is designed to be an AI agent's superpower for understanding people. Any agent with shell access can use the CLI. Any agent with HTTP access can hit the API directly.

## Why Agents Need People Data

AI agents frequently encounter people — in calendar events, emails, messages, documents. Orbit gives them instant context:

- **Meeting prep** — agent sees a calendar invite, looks up attendees, provides background
- **Email context** — agent reads an email from someone, enriches with their profile
- **Research** — agent investigates a topic and needs to understand the people involved
- **Networking** — agent helps find introductions through shared connections

## Using the CLI from an Agent

The `--json` flag on every command makes output easy to parse:

```bash
# Agent looks up a person mentioned in a message
orbit lookup "Jane Smith at Stripe" --json

# Agent prepares for a meeting
orbit profile <attendee-id> --brief

# Agent finds shared context between two people
orbit compare <my-id> <their-id> --json
```

## Using the API Directly

For agents that prefer HTTP:

```bash
# Search
curl -X POST https://api.orbitsearch.com/v2/social/profiles/searches/smart/sse \
  -H "App-Id: 0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d" \
  -H "App-Version: 1.0.0" \
  -H "Authorization: Bearer sk_orb_..." \
  -H "Content-Type: application/json" \
  -d '{"query": "Jane Smith", "numUsers": 1, "isManualInput": true}'

# Profile (no auth needed)
curl "https://api.orbitsearch.com/v2/social/profiles/users/{userId}?sortImagesAsOrbit=true&showFirstOrbit=true" \
  -H "App-Id: 0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d" \
  -H "App-Version: 1.0.0"
```

## MCP Integration

Orbit is available as an MCP server for agents that support the Model Context Protocol:

```bash
# Via mcporter
mcporter call orbit.search_people query="lawyers in San Francisco"
mcporter call orbit.get_profile userId="<uuid>"
mcporter call orbit.me
```

## Example: Meeting Prep Agent

An agent receives a calendar event with attendees. For each attendee:

1. `orbit lookup "Attendee Name" --json` — get their profile
2. Extract work history, accomplishments, shared connections
3. Generate a briefing document

```bash
# Pseudocode
for attendee in calendar_event.attendees:
    profile = orbit lookup "{attendee.name}" --json
    briefing += format_briefing(profile)
```

## Example: Network Explorer

An agent maps the network around a person:

```bash
# Get the person
orbit lookup "Mark Zuckerberg" --json > target.json

# Get their connections
USER_ID=$(cat target.json | jq -r '.userId')
orbit connections $USER_ID --json > connections.json

# Profile interesting connections
cat connections.json | jq -r '.[].senditId' | head -5 | while read id; do
  orbit profile $id --brief
done
```

## Tips for Agent Builders

- Use `--brief` for context that needs to fit in a prompt — it's 4 lines per person
- Use `--json` when the agent needs to extract specific fields
- `orbit lookup` is the fastest path from name → full profile (one command)
- `orbit connections` + `orbit compare` enable network analysis
- Profile data includes source URLs — agents can cite where info came from
