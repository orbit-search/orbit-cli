---
name: orbit
description: 'Search for anyone using Orbit — the people search engine. Use when: looking up a person by name, finding people by criteria (profession, location, interests), getting detailed profile info (work history, education, accomplishments, worldview, social links), or researching individuals in conversation. Use the CLI for shell access or the MCP tools via mcporter for programmatic access.'
metadata:
  {
    "openclaw": { "emoji": "🔍", "requires": { "anyBins": ["orbit"] } },
  }
---

# Orbit — People Search

Search for anyone and get detailed profiles with work history, education, accomplishments, worldview, passions, social media handles, and more.

## Quick Reference

```bash
# Search by name or natural language
orbit search "Jane Smith"
orbit search "lawyers in Los Angeles"
orbit search "Stanford engineers who worked at Google"
orbit search "Sam Altman" --first         # top result only
orbit search "dentists in Miami" --limit 3

# Lookup: search + full profile in one step
orbit lookup "Mark Zuckerberg"
orbit lookup "Mark Zuckerberg" --brief    # compact 4-line summary

# Get full profile by user ID
orbit profile <userId>
orbit profile <userId> --brief

# Get your own profile (authenticated)
orbit me
orbit me --brief

# JSON output (for piping / agent consumption)
orbit search "query" --json
orbit profile <userId> --json
orbit lookup "name" --json

# Auth management
orbit login          # Interactive (browser or paste key)
orbit login --key sk_orb_...  # Non-interactive
orbit whoami
orbit logout
```

## When to Use Orbit

**YES — use Orbit for:**
- Looking up a person mentioned in conversation
- Finding people by criteria: profession, location, interests, background
- Researching someone before a meeting, call, or introduction
- Finding work history, education, or accomplishments for someone
- Getting social media handles for a person
- Understanding someone's worldview, passions, or interests
- Providing context about people in any task that involves individuals

**NO — don't use Orbit for:**
- Company research (Orbit is for people, not companies)
- Finding contact info like email/phone (profiles may not have this)
- Real-time social media posts (Orbit shows profile data, not feeds)

## Commands

### `orbit search <query>`

Search using natural language. Not limited to names — you can search by profession, location, interests, or any combination.

```bash
# By name
orbit search "Nicholas Dominici"

# By profession and location
orbit search "lawyers in New York"
orbit search "doctors around me"

# By background
orbit search "Stanford engineers who worked at Google"
orbit search "YC founders in fintech"

# By interests
orbit search "people who are into rock climbing"

# JSON output for parsing
orbit search "Elon Musk" --json
```

### `orbit profile <userId>`

Get a detailed profile by user ID (UUID from search results).

```bash
orbit profile 293ce93b-4104-4cce-b1bb-7d89ddfa3238
orbit profile 293ce93b-4104-4cce-b1bb-7d89ddfa3238 --json
```

### `orbit me`

Quickly get your own profile. Requires authentication (`orbit login`).

```bash
orbit me
orbit me --json
```

### MCP Tools (via mcporter)

```bash
mcporter call orbit.search_people query="lawyers in San Francisco"
mcporter call orbit.get_profile userId="<uuid>"
mcporter call orbit.whoami
mcporter call orbit.me
```

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

**Anonymous mode** (default): Works out of the box for basic searches and profile lookups.

**Authenticated mode** (`orbit login`): Uses a personal API key for better search results, match reasoning, and access to `orbit me`.

1. Run `orbit login` — opens browser
2. Sign in with your phone number (SMS OTP)
3. API key is automatically created and saved
4. All subsequent commands use authenticated endpoints

## Tips

- **Search is natural language** — don't just search names. Try "engineers at Stripe", "investors in crypto", "teachers in Austin"
- **User IDs are UUIDs** — copy them from search results to use with `orbit profile`
- **Profiles are pre-generated** — not every person in the world has an Orbit profile. If someone isn't found, they haven't been indexed yet
