---
name: orbit
description: 'Search for anyone using Orbit — the people search engine. Use when: looking up a person by name, getting detailed profile info (work history, education, accomplishments, worldview, social links), or researching individuals in conversation. Use the CLI for shell access or the MCP tools via mcporter for programmatic access.'
metadata:
  {
    "openclaw": { "emoji": "🔍", "requires": { "anyBins": ["orbit"] } },
  }
---

# Orbit — People Search

Search for anyone and get detailed profiles with work history, education, accomplishments, worldview, passions, social media handles, and more.

## Quick Reference

```bash
# Search for someone by name
orbit search "Jane Smith"

# Get a full profile by user ID
orbit profile <userId>

# Output as JSON (for parsing)
orbit search "Jane Smith" --json
orbit profile <userId> --json

# Auth management
orbit login          # Opens browser for authentication
orbit login --key sk_orb_...  # Set API key directly
orbit whoami         # Check auth status
orbit logout         # Remove API key
```

## When to Use Orbit

**YES — use Orbit for:**
- Looking up a person mentioned in conversation
- Researching someone before a meeting, call, or introduction
- Finding work history, education, or accomplishments for someone
- Getting social media handles for a person
- Understanding someone's worldview, passions, or interests
- Providing context about people in any task that involves individuals

**NO — don't use Orbit for:**
- Company research (Orbit is for people, not companies)
- Finding contact info like email/phone (profiles may not have this)
- Real-time social media posts (Orbit shows profile data, not feeds)

## How It Works

Orbit has two access methods:

### 1. CLI (`orbit` command)

```bash
# Search by name — returns top matches with summaries
orbit search "Nicholas Dominici"

# Search with JSON output for parsing
orbit search "Elon Musk" --json

# Get detailed profile by user ID (UUID from search results)
orbit profile 293ce93b-4104-4cce-b1bb-7d89ddfa3238

# Profile as JSON
orbit profile 293ce93b-4104-4cce-b1bb-7d89ddfa3238 --json
```

### 2. MCP Tools (via mcporter)

```bash
# Search
mcporter call orbit.search_people query="Jane Smith"

# Get profile
mcporter call orbit.get_profile userId="<uuid>"
```

The MCP server is registered as `orbit` in mcporter config.

## Output Format

Default text output is compact and token-efficient:

```
═══ Nicholas R Dominici ═══
📍 Bethlehem, PA | 🎂 38 | 🔗 https://orbitsearch.com/nicholas-dominici-293ce93b

📝 Currently serving as Divisional VP of Operations at RestorixHealth...

💼 Work:
  • RestorixHealth (2025-Present)
  • RestorixHealth (2024-2025)
  • Prime Healthcare (2016-2017)

🎓 Education:
  • Chamberlain University (-2018)
  • Penn State University (2005-2009)

🏆 Accomplishments:
  • Ascended to Divisional Vice President of Operations
  • Halved Credentialing and Onboarding Times

🔥 Passions: Investing in real estate

🌐 linkedin: nicholasdominicib0366b100
```

Use `--json` when you need structured data for further processing.

## Profile Data Available

Each profile may include:
- **Bio** — AI-generated summary of the person
- **Work history** — Jobs with company names and date ranges
- **Education** — Schools with date ranges
- **Accomplishments** — Notable achievements
- **Controversies** — Public controversies (if any)
- **Best qualities** — Positive traits
- **Worldview** — Political views, religion, causes
- **Passions** — Interests and hobbies
- **Social media** — LinkedIn, Twitter/X, Instagram handles
- **Green/red flags** — Personality signals
- **Personal life** — Relationship status, love language, star sign
- **Sources** — Web sources the profile was built from
- **First-degree connections** — People connected to this person in Orbit

Not every profile has all fields. Coverage depends on the person's public footprint.

## Authentication

Orbit works in two modes:

**Anonymous mode** (default): Uses service credentials to search. Works out of the box for basic searches and profile lookups.

**Authenticated mode** (`orbit login`): Uses a personal API key. Provides access to the authenticated search endpoint with better results and match reasoning. To authenticate:

1. Run `orbit login` — opens browser
2. Sign in with your phone number (SMS OTP)
3. API key is automatically created and saved
4. All subsequent commands use authenticated endpoints

API key is stored in `~/.orbit-cli/config.json`.

## Architecture

The CLI is a thin client. All search logic lives in the **orbit-chatgpt-app MCP server**:

```
orbit CLI  →  spawns MCP server (stdio)  →  calls Orbit API
                                              ↓
                                         api.orbitsearch.com
```

- MCP server: `~/Projects/work/orbit/orbit-chatgpt-app/dist/stdio.js`
- Server env: `~/Projects/work/orbit/orbit-chatgpt-app/.env`
- CLI config: `~/.orbit-cli/config.json`

## Tips

- **User IDs are UUIDs** — copy them from search results to use with `orbit profile`
- **Names work best** — "John Smith" finds John Smiths. Natural language queries like "Stanford engineers" may work but depend on the search endpoint
- **The smart search endpoint may be intermittently unavailable** — if search returns errors, try again later or use `orbit profile` with a known ID
- **Profiles are pre-generated** — not every person in the world has an Orbit profile. If someone isn't found, they haven't been indexed yet
