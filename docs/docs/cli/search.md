---
sidebar_position: 1
---

# orbit search

Search for people using natural language.

## Usage

```bash
orbit search <query> [options]
```

## Options

| Flag | Description | Default |
|---|---|---|
| `-j, --json` | Output structured JSON | off |
| `-n, --limit <n>` | Max number of results | 6 |
| `-1, --first` | Return only the top result | off |

## Examples

```bash
# By name
orbit search "Jane Smith"

# By profession and location
orbit search "lawyers in Los Angeles"
orbit search "dentists in Miami"

# By company
orbit search "engineers at Stripe"
orbit search "founders of Builder.ai"
orbit search "people who worked at Northvolt"

# By background
orbit search "Stanford engineers who worked at Google"
orbit search "YC founders in fintech"

# By interest
orbit search "people into rock climbing in Colorado"

# Options
orbit search "Sam Altman" --first
orbit search "VCs in San Francisco" --limit 3
orbit search "query" --json
```

## Output

Default text output shows one line per result:

```
Sam Altman | United States  [9974d324-1227-48c4-bce1-5cf7ec4f3a9d]
  CEO of OpenAI and former Y Combinator president.
```

Each result includes:
- **Display name**
- **Age** (if available)
- **City** (if available)
- **User ID** in brackets — use this with `orbit profile`
- **Match reason** — why this person matched your query

## JSON Output

```bash
orbit search "Sam Altman" --first --json
```

```json
[
  {
    "userId": "9974d324-1227-48c4-bce1-5cf7ec4f3a9d",
    "displayName": "Sam Altman",
    "age": null,
    "city": "United States",
    "matchReason": "CEO of OpenAI and former Y Combinator president."
  }
]
```

## Notes

- Search uses SSE (server-sent events) with a 60-second timeout
- Authenticated searches return better match reasoning
- Results are not full profiles — use `orbit profile <userId>` or `orbit lookup` for full data
