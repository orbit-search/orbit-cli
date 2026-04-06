# Orbit CLI

Search for anyone and get detailed profiles from the command line. Powered by [Orbit](https://orbitsearch.com) — the people search engine.

Orbit builds comprehensive profiles from public data — work history, education, accomplishments, passions, social media, connections, and more. The CLI gives you direct access to all of this from your terminal.

## Quick Start

```bash
git clone https://github.com/orbit-search/orbit-cli.git
cd orbit-cli
npm install
npm run build
npm link
```

Now `orbit` is available globally. Try it:

```bash
orbit search "engineers at Stripe"
orbit lookup "Sam Altman"
orbit me
```

## Authentication

**Anonymous mode** works out of the box — basic search and profile lookups.

**Authenticated mode** gives you better search results and access to `orbit me`:

```bash
orbit login                          # Interactive (browser or paste key)
orbit login --key sk_orb_your_key    # Direct key input
orbit whoami                         # Check auth status
orbit logout                         # Remove key
```

API keys are stored at `~/.orbit-cli/config.json`.

## Commands

### `orbit search <query>`

Natural language people search. Not limited to names.

```bash
orbit search "Jane Smith"
orbit search "lawyers in Los Angeles"
orbit search "Stanford engineers who worked at Google"
orbit search "founders of Builder.ai"
orbit search "investors in crypto"

# Options
orbit search "Sam Altman" --first       # Top result only
orbit search "query" --limit 3          # Cap results
orbit search "query" --json             # Structured output
```

Returns: name, age, city, match reason, and user ID for each result.

### `orbit lookup <query>`

Search + full profile in one command. Finds the top match and shows the full dossier.

```bash
orbit lookup "Mark Zuckerberg"
orbit lookup "Mark Zuckerberg" --brief  # 4-line summary
orbit lookup "Mark Zuckerberg" --json
```

This is the fastest way to go from a name to a full profile.

### `orbit profile <userId>`

Full profile by user ID (UUID from search results or connections).

```bash
orbit profile a7b7449d-3b89-4bf1-95fc-183e831f31cc
orbit profile a7b7449d-3b89-4bf1-95fc-183e831f31cc --brief
orbit profile a7b7449d-3b89-4bf1-95fc-183e831f31cc --json
```

### `orbit connections <userId>`

List all first-degree connections for a person. Each connection includes their user ID so you can chain into `orbit profile`.

```bash
orbit connections a7b7449d-3b89-4bf1-95fc-183e831f31cc
orbit connections a7b7449d-3b89-4bf1-95fc-183e831f31cc --limit 20
orbit connections a7b7449d-3b89-4bf1-95fc-183e831f31cc --json
```

### `orbit compare <userIdA> <userIdB>`

Side-by-side comparison of two people. Shows shared connections, companies, schools, and skills.

```bash
orbit compare <userId1> <userId2>
orbit compare <userId1> <userId2> --json
```

### `orbit me`

Your own profile (requires authentication).

```bash
orbit me
orbit me --brief
orbit me --json
```

## Output Formats

**Default** — Human-readable, compact text:
```
Nicholas Vinicius Dominici | 23 | b. 2002-12-01 | Santa Monica, CA
https://orbitsearch.com/nicholas-dominici286

Currently based in Santa Monica, Nicholas Dominici is a Director of Innovation...
  src: https://grokipedia.com/... https://linkedin.com/...
Skills: Machine Learning, TypeScript, Python, JavaScript, Unity, AR
Locations: West Palm Beach, FL > Santa Monica, CA > Los Angeles, CA

WORK
  Orbit Intelligence | 2026-Present
    Building the next-gen people data layer for agents.
  Iconic Hearts | 2024-2026
    As the Director of Innovation, I lead our efforts in pioneering next-gen social...

ACCOMPLISHMENTS
  Created Viral Vogue Lens Amassing 2.4 Billion Views
  ...

SOCIAL
  linkedin: nicholas-dominici-110b4a178 | github: NicholasDominici | snapchat: nick-dominici

CONNECTIONS (50)
  Garrison R Magyar [00a08c0e...]
  ...
```

**`--brief`** — 4-line summary:
```
Nicholas Vinicius Dominici | 23 | Santa Monica, CA
Currently based in Santa Monica, Nicholas Dominici is a Director of Innovation...
Work: Orbit Intelligence (2026-Present), Iconic Hearts (2024-2026)
linkedin: nicholas-dominici-110b4a178 | github: NicholasDominici | snapchat: nick-dominici
```

**`--json`** — Full structured data for programmatic use:
```bash
orbit profile <id> --json | jq '.jobs'
orbit search "query" --json | jq '.[0].userId'
orbit connections <id> --json | jq '.[].fullName'
```

## Profile Data

Each profile may include:

| Section | Description |
|---|---|
| Bio | AI-generated summary |
| Basics | Birthday, location, skills, previous locations |
| Work | Companies, titles, descriptions, date ranges |
| Education | Schools with date ranges |
| Accomplishments | Notable achievements |
| Controversies | Public controversies |
| Passions | Interests with descriptions |
| Personal Life | Background, birthplace, traits |
| Best Qualities | Positive traits |
| Worldview | Politics, religion, causes |
| Social | LinkedIn, GitHub, Twitter, Instagram, etc. |
| Connections | First-degree connections with IDs |
| Sources | Web sources per section (deduped by domain) |

Not every profile has all fields. Coverage depends on the person's public footprint.

## Search Capabilities

Orbit's search understands natural language. Some examples:

```bash
# By name
orbit search "Jane Smith"

# By profession + location
orbit search "dentists in Miami"
orbit search "lawyers in New York"

# By company
orbit search "engineers at Stripe"
orbit search "founders of Builder.ai"
orbit search "people who worked at Northvolt"

# By background
orbit search "Stanford engineers who worked at Google"
orbit search "YC founders in fintech"

# By interest
orbit search "people into rock climbing in Colorado"
```

## Piping & Scripting

The CLI is designed for composability:

```bash
# Search → get first user ID → full profile
orbit search "Sam Altman" --first --json | jq -r '.[0].userId' | xargs orbit profile

# Get all connection IDs
orbit connections <id> --json | jq -r '.[].senditId'

# Batch profile lookups
orbit connections <id> --json | jq -r '.[].senditId' | head -5 | xargs -I {} orbit profile {} --brief

# Compare yourself to someone
ME=$(orbit me --json | jq -r '.userId')
orbit compare $ME <otherUserId>
```

## API Endpoints

The CLI hits these Orbit API endpoints:

| Command | Endpoint |
|---|---|
| `search` | `POST /v2/social/profiles/searches/smart/sse` (authenticated) or `/smart/internal` (anonymous) |
| `profile` | `GET /v2/social/profiles/users/{userId}` |
| `me` | `GET /v1/profile` → resolves userId → profile endpoint |

All requests include `App-Id` and `App-Version` headers. Authenticated requests add `Authorization: Bearer sk_orb_...`.

## Architecture

```
src/
  cli.ts           # Command definitions (Commander.js)
  api.ts           # API client, formatters
  extractors.ts    # Raw API response → structured ProfileDetails
  types.ts         # TypeScript types for all data models
  commands/
    search.ts      # orbit search
    profile.ts     # orbit profile
    lookup.ts      # orbit lookup (search + profile)
    connections.ts # orbit connections
    compare.ts     # orbit compare
    me.ts          # orbit me
    login.ts       # orbit login
  utils/
    config.ts      # ~/.orbit-cli/config.json management
```

## Requirements

- Node.js >= 18
- npm

## License

MIT
