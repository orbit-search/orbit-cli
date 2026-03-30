# Orbit CLI

Search for anyone and get detailed profiles from the command line. Powered by [Orbit](https://orbitsearch.com).

Orbit builds comprehensive profiles from public data — work history, education, accomplishments, passions, social media, connections, and more. The CLI gives you direct access to all of this from your terminal.

## Install

```bash
git clone https://github.com/orbit-search/orbit-cli.git
cd orbit-cli
npm install
npm run build
npm link
```

Now `orbit` is available globally.

## Authentication

Orbit works in two modes:

**Anonymous** — works out of the box with basic search and profile lookups.

**Authenticated** — uses your API key for better search results and access to `orbit me`.

```bash
# Interactive login (browser or paste key)
orbit login

# Direct key input (for scripts/CI)
orbit login --key sk_orb_your_key_here

# Check status
orbit whoami

# Remove key
orbit logout
```

To get an API key, go to Settings on [orbitsearch.com](https://orbitsearch.com).

## Commands

### `orbit search <query>`

Natural language search. Not limited to names — search by profession, location, interests, or anything.

```bash
orbit search "Jane Smith"
orbit search "lawyers in Los Angeles"
orbit search "Stanford engineers who worked at Google"
orbit search "founders in the AI space"

# JSON output
orbit search "Jane Smith" --json
```

### `orbit profile <userId>`

Get a full profile by user ID (UUID from search results).

```bash
orbit profile a7b7449d-3b89-4bf1-95fc-183e831f31cc
orbit profile a7b7449d-3b89-4bf1-95fc-183e831f31cc --json
```

### `orbit me`

Get your own profile (requires authentication).

```bash
orbit me
orbit me --json
```

### `orbit login`

Authenticate with Orbit. Interactive menu lets you choose browser auth or paste an API key.

### `orbit whoami`

Show current authentication status.

### `orbit logout`

Remove saved API key.

## Profile Data

Each profile can include:

- **Bio** — AI-generated summary
- **Basics** — birthday, location, skills, previous locations
- **Work history** — companies, titles, descriptions, timelines
- **Education** — schools with date ranges
- **Accomplishments** — notable achievements with detailed narratives
- **Passions** — interests with descriptions and details
- **Personal life** — background, personality traits
- **Best qualities** — positive traits
- **Controversies** — public controversies if any
- **Worldview** — political views, religion, causes
- **Fun facts** — categorized insights (hobbies, early life, brand preferences, music, etc.)
- **Social media** — LinkedIn, GitHub, Snapchat, Instagram, etc.
- **Connections** — people connected to them in Orbit
- **Sources** — web sources the profile was built from
- **Photos** — profile and discovered photos

Not every profile has all fields. Coverage depends on the person's public footprint.

## JSON Output

Pass `--json` to any command for structured JSON output. Useful for piping into other tools or for agent consumption.

```bash
# Pipe profile to jq
orbit profile <id> --json | jq '.jobs'

# Get just social links
orbit profile <id> --json | jq '.socialLinks'

# Search and get IDs
orbit search "query" --json | jq '.[].userId'
```

## Agent / MCP Usage

Orbit is designed to be an agent's superpower for understanding people. An AI agent can:

1. **Self-setup**: Run `orbit me` to instantly understand its user
2. **Research anyone**: Run `orbit search` before meetings, calls, or introductions
3. **Deep context**: Use `--json` for structured data that's easy to parse and reason about

### As an OpenClaw Skill

Install the skill from the `skills/orbit/` directory in this repo, or use `orbit` directly from the command line.

### As an MCP Server

The Orbit MCP server ([orbit-chatgpt-app](https://github.com/orbit-search/orbit-chatgpt-app)) exposes the same capabilities via MCP protocol:

- `search_people` — natural language search
- `get_profile` — full profile by user ID
- `me` — authenticated user's own profile
- `whoami` — auth status

## Configuration

Config is stored at `~/.orbit-cli/config.json`:

```json
{
  "apiKey": "sk_orb_..."
}
```

## Requirements

- Node.js >= 18
- npm

## License

MIT
