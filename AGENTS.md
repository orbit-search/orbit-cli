# Orbit CLI + MCP Server

Build a **CLI tool and MCP server** for searching people via Orbit's APIs. This is for an AI agent (me) to use programmatically — optimize for **token efficiency** and **clean structured output**.

## Architecture

Single TypeScript/Node.js project with two entrypoints:
1. **CLI** (`orbit`) — shell command for searching people
2. **MCP Server** — Streamable HTTP MCP server for tool integration

## API Surface

### 1. Orbit Public API (`https://api.orbitsearch.com`)
- Use only documented Orbit API endpoints. Do not hard-code service-specific hosts, undocumented endpoint names, or raw credentials in the CLI.
- Treat the published Orbit API schema as the source of truth for endpoint paths, request fields, response fields, and identifier mapping. This file describes CLI behavior, not the full API reference.
- **Auth:** use the Orbit API credentials provided by the deployment environment or user config.
- **Profile Search:** use the documented profile search endpoint to search stored profiles by name.
  - Input: name plus optional ranking/filter hints such as age or location.
  - Returns: matching profiles. Normalize the upstream identifier to stable public `profileId` before CLI/MCP output.
- **Full Orbit Profile:** fetch the public profile through the documented profile endpoint using the stable profile identifier.
- **Profile Enrichment:** not exposed by the current CLI. If future support is added, use only the documented Orbit API schema and do not embed service-specific routes or credentials.

### 2. Profile Details API (`https://api.orbitsearch.com`)
- **Auth:** use the app credentials provided by the deployment environment or user config.
- **Profile by ID:** `GET /v2/social/profiles/users/{userId}?sortImagesAsOrbit=true&showFirstOrbit=true`
  - CLI commands accept `profileId`; pass that value as the upstream `userId` path parameter.
- **Profile by Username:** `GET /v2/social/profiles/usernames/{username}` exists in the public API, but the current CLI does not route `orbit profile` inputs through it.
- The upstream schema may expose legacy identifier field names; CLI/MCP output normalizes stable profile identifiers to `profileId`.
- Returns rich AI-generated data:
  ```
  payload.socialProfile.aiRating = {
    bio, basic: {birthday, location},
    jobs: {jobs: [{name, extData: {years}}]},
    education: {educations: [{name, extData: {years}}]},
    accomplishments: {accomplishments: [{name, reason}]},
    controversies: {controversies: [{name, reason}]},
    bestQualities: {qualities: [{name}]},
    netWorth: {netWorth: [{name}]},
    greenFlagsV2: {flags: {...}},
    redFlagsV2: {flags: {...}},
    personalLife: {flags: {...}},
    worldview: {politics, religion, causes},
    passions: [{passion, description}]
  }
  payload.socialProfile.socialMediaHandles = [{media, handle}]
  payload.socialProfile.orbitSources = [{link, title, sourceName}]
  payload.orbitFirstDegree = {users: [{senditId, fullName}]}
  ```
- **Natural Language Search:** use the documented authenticated search endpoint.
  - Body: query, requester profile identifier when required by the published schema, result count, and manual-input flag.
  - Resolve the requester profile identifier from the authenticated session when available; otherwise read it from user config.
  - Returns upstream users with identifiers such as `userId`; normalize to `profileId` before CLI/MCP output.
  - Treat this as optional/fallback when unavailable.

### Proxy Routes

This repo does not own a public proxy route. CLI code should call the documented Orbit API host directly. If a host application wraps these endpoints behind its own proxy, document that proxy route in that host application's repository and keep the same identifier mapping rules.
Do not add guessed proxy paths or product-specific wrapper URLs to this repo. Cross-reference the owning host application's docs instead, and keep this CLI limited to the configurable `ORBIT_API_HOST` plus documented Orbit API paths.

## CLI Commands

### `orbit search <query>`
Search for people by name. This is the primary command.
1. First, search stored Orbit profiles through the Orbit API.
2. For top results (up to 3), fetch rich profile details using the stable profile identifier.
3. Output a clean, token-efficient summary

Options:
- `--limit <n>` — number of results (default: 3)
- `--json` — raw JSON output
- `--verbose` — include all fields
- `--age <n>` — filter/rank by age
- `--location <state>` — filter hint

### `orbit profile <profileId>`
Get full profile for a specific person by stable profile ID.
1. Fetch the corresponding profile directly using the provided `profileId`.
2. Output comprehensive profile data.

Options:
- `--json` — raw JSON
- `--section <name>` — only show specific section (bio, jobs, education, worldview, etc.)
- `--brief` — one-paragraph summary only
- `--sources` — include source URLs

## Output Format (Token-Efficient)

Default text output should be **compact but complete**. Example:

```
═══ Nicholas Dominici ═══
📍 Bethlehem, PA | 🎂 38 | 🔗 orbitsearch.com/293ce93b...

📝 Bio: Currently serving as Divisional VP of Operations at RestorixHealth...

💼 Work:
  • RestorixHealth — Divisional VP of Operations (2025-)
  • RestorixHealth — Regional VP of Operations (2024-2025)
  • RestorixHealth — VP of Operations (2020-2024)

🎓 Education:
  • East Stroudsburg University

🌐 Social: linkedin.com/in/nicholasdominicib0366b100

📊 Sources: 7 sources indexed
```

For `--json`, output the full structured data. For `--brief`, output a single line:
```
Nicholas Dominici | 38 | Bethlehem, PA | DVP Operations @ RestorixHealth | ESU
```

## MCP Server

MCP support is not currently implemented in `src/`. If it is added, wrap the existing `src/api.ts` client and expose the same public CLI capabilities via Streamable HTTP transport.

### Future tools:
1. **`search_people`** — Search by name, returns list of matching profiles with key details
2. **`get_profile`** — Get full profile by ID

### Server config:
- Default port: 3847
- Path: `/mcp`
- Use `@modelcontextprotocol/sdk` for MCP implementation

## Project Structure

```
orbit-cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts              # CLI entrypoint; also owns me/whoami/logout
│   ├── api.ts              # Orbit API client and text formatters
│   ├── extractors.ts       # Raw API response -> structured profile data
│   ├── types.ts            # Shared TypeScript types
│   ├── commands/
│   │   ├── search.ts       # search command
│   │   ├── profile.ts      # profile command
│   │   ├── lookup.ts       # search + profile command
│   │   ├── connections.ts  # first-degree connections
│   │   ├── compare.ts      # compare two profiles
│   │   ├── sections.ts     # profile section fetches
│   │   └── login.ts        # config/login flow
│   └── utils/
│       └── config.ts       # Config/env handling
├── bin/
│   └── orbit              # Shebang entrypoint
├── docs/                  # Customer-facing docs
├── skills/
│   └── orbit/             # Agent skill wrapper
├── dist/                  # Generated build output
└── opencode.json
```

## Config

Support env vars AND a config file at `~/.orbit-cli/config.json`:

```json
{
  "orbitApiHost": "https://api.orbitsearch.com",
  "apiKey": "<configured at install time>",
  "appId": "<provided by Orbit>",
  "appVersion": "1.0.0",
  "requestingProfileId": "<current-user-profile-id>"
}
```

Also support `orbitApiKey` as a config-file alias and env vars: `ORBIT_API_HOST`, `ORBIT_API_KEY`, `ORBIT_APP_ID`, `ORBIT_APP_VERSION`, `ORBIT_REQUESTING_PROFILE_ID`, etc.
The app ID is issued with API access. If a user has an API key but no app ID, tell them to request one from their Orbit workspace administrator or support contact; do not restore or invent a bundled default.

## Identifier Mapping

- CLI and future MCP output must use `profileId` as the stable public identifier.
- Direct REST API docs and examples must preserve the published upstream field names. Some endpoints still use `userId` as the path parameter or response field, and some nested relationship records still expose `senditId` or `sendit_id`.
- Normalize `userId`, `senditId`, and `sendit_id` to `profileId` only inside CLI extraction/output code. Do not rewrite direct REST API response examples to claim the upstream payload returns `profileId` unless the live API schema changes.
- Some payloads expose `orbitId`/`orbit_id` as a public slug or legacy source identifier. Do not use it as the profile fetch path value unless that endpoint explicitly documents it as the canonical profile UUID; otherwise keep it as metadata and derive CLI `profileId` from `profileId`, `senditId`, `sendit_id`, or `userId`.
- `orbitFirstDegree.users[].senditId` in direct REST examples is intentionally an upstream field name; CLI extractors convert it to `orbitFirstDegree[].profileId` before user-facing output.
- The CLI config field `requestingProfileId` maps to the search request body's published `userId` field when that requester identifier is required.

### Identifier Cross-References

When editing docs, examples, or command help, keep these mappings together:
- Profile fetch commands accept `profileId`, but the direct REST path remains `/v2/social/profiles/users/{userId}` until the published API changes.
- Natural-language search may send the CLI config field `requestingProfileId` as the request body's published `userId`; do not rename the wire field in REST examples. Search result identifiers must be normalized with the same `profileId`, `senditId`, `sendit_id`, then `userId` fallback order before passing them to profile-fetch commands.
- Relationship payloads may contain `senditId` or `sendit_id`; CLI/MCP output should expose that value as `profileId`.
- Proxy route notes belong only in the repository that owns the proxy. This repo should reference public Orbit API paths or the configurable API host, not wrapper routes from another application.

## Technical Requirements

- TypeScript with strict mode
- Node.js 20+ (use native fetch, no axios)
- ESM modules (type: "module")
- Minimal dependencies: commander (CLI), @modelcontextprotocol/sdk (MCP)
- Build with tsc, output to dist/
- Make the CLI globally installable via `npm link`
- Include a `bin/orbit` shebang script that runs `node dist/cli.js`

## Key Design Principles

1. **Token efficiency** — Default output should be compact. An AI agent reading the output should get maximum info with minimum tokens.
2. **Graceful degradation** — If enriched profile details are unavailable, still return the stored profile data. If natural language search is unavailable, say so clearly.
3. **Fast** — Search existing profiles first and do not trigger background enrichment implicitly.
4. **Composable** — Each command can output JSON for piping into other tools.

## Important Notes

- Use stable public profile identifiers when linking between commands.
- `profileId` is the public profile identifier used across search results, profile fetches, connection lists, and natural-language search matches.
- Normalize existing API response identifier fields such as `userId`, `senditId`, or `sendit_id` to `profileId` before exposing CLI or MCP output.
- Anonymous search mode is intentionally removed; users must authenticate with `orbit login` or `ORBIT_API_KEY` for search.
- Not all profile records have every enrichment field available.
- Do not embed raw credentials, undocumented endpoints, or implementation-specific service names in output or generated config.
