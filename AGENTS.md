# Orbit CLI + MCP Server

Build a **CLI tool and MCP server** for searching people via Orbit's APIs. This is for an AI agent (me) to use programmatically — optimize for **token efficiency** and **clean structured output**.

## Architecture

Single TypeScript/Node.js project with two entrypoints:
1. **CLI** (`orbit`) — shell command for searching people
2. **MCP Server** — Streamable HTTP MCP server for tool integration

## API Backends

### 1. Deep Search API (`https://deep-search.orbitsearch.com`)
- **Auth:** `x-api-key: 3d29e5d7-55a2-4ccb-bbe1-caa241d7d2d2` header
- **Profile Search:** `POST /v1/people/profiles/search` — search stored profiles by name
  - Body: `{"person_name": "...", "age": 23}` (age optional, used for ranking)
  - Returns: `{"success": true, "profiles": [{"orbit_id": "...", "name": "...", "age": 50, "location": "CA", "mobile_phone": "...", ...}]}`
- **Full Orbit Profile:** `GET /v1/people/profile/orbit/{orbit_id}` 
  - Returns: Full profile with jobs, schools, fun_facts, social_profiles, search_engine_results, phone_numbers, email_addresses, historical_addresses, linkedin_profile_url, etc.
- **Trigger Deep Search:** `POST /v2/people/search/deep/light`
  - Body: `{"person_name": "First Last", "phone": "+1234", "level2_urls": ["https://x.com/handle"], "origin": "cli", "is_sync_mode": false, "do_enrich": true}`
  - Returns: `{"search_id": "...", "job_id": "..."}` (async)
- **Search Status:** `GET /v1/people/search/{search_id}/status`
- **Search Response:** `GET /v1/people/search/{search_id}/response`

### 2. Social Profile API (`https://api.orbitsearch.com`)
- **Auth:** Headers: `app-id: 0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d`, `app-version: 1.0.0`
- **Profile by UUID:** `GET /v2/social/profiles/users/{userId}?sortImagesAsOrbit=true&showFirstOrbit=true`
- **Profile by Username:** `GET /v2/social/profiles/usernames/{username}`
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
- **Smart Search (internal):** `POST /v2/social/profiles/searches/smart/internal`
  - Auth: `api-key: b64e0e40-556f-488d-a416-f5841b0811e8` header (note: header name is `api-key`, NOT `sendit-api-key`)
  - Body: `{"query": "...", "userId": "5181db5e-e761-472d-9e0e-98af519bc974", "numUsers": 6, "isManualInput": true}`
  - Returns: `{status: "success", payload: {users: [{userId, matchReason}]}}`
  - NOTE: This endpoint may return 500 due to server-side dependency issues. Treat as optional/fallback.

## CLI Commands

### `orbit search <query>`
Search for people by name. This is the primary command.
1. First, search deep-search profiles: `POST /v1/people/profiles/search`
2. For top results (up to 3), fetch rich social profile via 2020 API using sendit_id
3. Output a clean, token-efficient summary

Options:
- `--limit <n>` — number of results (default: 3)
- `--json` — raw JSON output
- `--verbose` — include all fields
- `--age <n>` — filter/rank by age
- `--location <state>` — filter hint

### `orbit profile <orbit_id_or_sendit_id>`
Get full profile for a specific person.
1. If orbit_id (from deep-search), fetch both orbit profile AND social profile
2. If sendit_id (UUID from social API), fetch social profile directly
3. Output comprehensive profile data

Options:
- `--json` — raw JSON
- `--section <name>` — only show specific section (bio, jobs, education, worldview, etc.)
- `--brief` — one-paragraph summary only
- `--sources` — include source URLs

### `orbit deep-search <name>`
Trigger a new deep search for someone not in the system.
- `--phone <number>` — phone number (improves accuracy)
- `--twitter <handle>` — Twitter/X handle
- `--wait` — poll until complete (with progress)

### `orbit smart-search <natural_language_query>`
Natural language search via the smart search API.
- Example: `orbit smart-search "Stanford engineers who worked at Google"`
- Falls back gracefully if the endpoint is unavailable.

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

Expose the same functionality as MCP tools via Streamable HTTP transport.

### Tools:
1. **`search_people`** — Search by name, returns list of matching profiles with key details
2. **`get_profile`** — Get full profile by ID
3. **`deep_search`** — Trigger new deep search
4. **`smart_search`** — Natural language search (optional, may be unavailable)

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
│   ├── cli.ts              # CLI entrypoint (uses commander or similar)
│   ├── mcp-server.ts       # MCP server entrypoint
│   ├── api/
│   │   ├── deep-search.ts  # Deep Search API client
│   │   ├── social-api.ts   # 2020 Social Profile API client
│   │   └── types.ts        # Shared types
│   ├── commands/
│   │   ├── search.ts       # search command
│   │   ├── profile.ts      # profile command
│   │   ├── deep-search.ts  # deep-search command
│   │   └── smart-search.ts # smart-search command
│   └── utils/
│       ├── formatter.ts    # Output formatting (text, json, brief)
│       └── config.ts       # Config/env handling
├── bin/
│   └── orbit              # Shebang entrypoint
└── opencode.json
```

## Config

Support env vars AND a config file at `~/.orbit-cli/config.json`:

```json
{
  "deepSearchApiKey": "3d29e5d7-55a2-4ccb-bbe1-caa241d7d2d2",
  "deepSearchHost": "https://deep-search.orbitsearch.com",
  "socialApiHost": "https://api.orbitsearch.com",
  "socialApiAppId": "0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d",
  "socialApiAppVersion": "1.0.0",
  "socialApiKey": "b64e0e40-556f-488d-a416-f5841b0811e8",
  "serviceUserId": "5181db5e-e761-472d-9e0e-98af519bc974"
}
```

Also support env vars: `ORBIT_DEEP_SEARCH_API_KEY`, `ORBIT_SOCIAL_API_KEY`, etc.

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
2. **Graceful degradation** — If social API is down, still return deep-search data. If smart search 500s, say so clearly.
3. **Fast** — Search existing profiles first, only trigger deep search when explicitly asked.
4. **Composable** — Each command can output JSON for piping into other tools.

## Important Notes

- The `sendit_id` field from deep-search profiles is the `userId` used to query the social API
- Not all profiles have a sendit_id — some are deep-search only
- The social API profile endpoint doesn't require auth for GET requests (just app-id/app-version headers)
- Deep search API always requires `x-api-key` header
- Smart search internal endpoint requires `api-key` header (different from deep search key!)
