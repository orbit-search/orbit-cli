---
sidebar_position: 7
---

# orbit get

Extract a specific section from a profile. Useful for targeted data retrieval without pulling the full profile.

## Usage

```bash
orbit get <userId> <section> [options]
```

## Options

| Flag | Description |
|---|---|
| `-j, --json` | Output structured JSON |

## Sections

| Section | Description |
|---|---|
| `bio` | AI-generated bio with sources |
| `work` | Work history with companies, titles, descriptions |
| `education` | Schools with date ranges |
| `accomplishments` | Notable achievements |
| `controversies` | Public controversies |
| `passions` | Interests with descriptions |
| `personal` | Personal life background |
| `qualities` | Best qualities / positive traits |
| `worldview` | Politics, religion, causes |
| `social` | Social media handles |
| `connections` | First-degree connections with user IDs |
| `sources` | All web sources the profile was built from |
| `facts` | All fun facts, grouped by category with source citations |
| `skills` | Technical and professional skills |
| `locations` | Current and previous locations |

## Examples

```bash
# All web sources
orbit get a7b7449d-... sources

# Fun facts as JSON (with labels and source URLs)
orbit get a7b7449d-... facts --json

# All connections with IDs (pipe into orbit profile)
orbit get a7b7449d-... connections --json

# Just the work history
orbit get a7b7449d-... work

# Social handles
orbit get a7b7449d-... social

# Skills list
orbit get a7b7449d-... skills
```

## Output: sources

```
Iconic Hearts, Inc. | The Org: https://theorg.com/org/iconic-hearts
Nicholas Dominici - Grokipedia: https://grokipedia.com/page/Nicholas_Dominici
...

17 sources
```

## Output: facts

```
WORK HISTORY (40)
  Started his software engineering career with an early role as a Data Research Intern...
  Reported as a Lens creator and influencer on Snapchat...

HOBBIES AND INTERESTS (4)
  Had been listed as a contributor in a Snapchat Lens Studio creators directory...

EARLY LIFE (1)
  Born in Hyannis, Massachusetts...

136 facts total
```

## Output: facts --json

```json
[
  {
    "text": "Started his software engineering career with an early role...",
    "labels": ["work_history"],
    "sources": [
      { "name": "grokipedia.com", "url": "https://grokipedia.com/page/Nicholas_Dominici" }
    ]
  }
]
```

## Output: connections --json

```json
[
  {
    "senditId": "00a08c0e-e773-4f11-88bf-fd3092ecc721",
    "fullName": "Garrison R Magyar",
    "avatarUrl": "https://...",
    "link": "https://orbitsearch.com/00a08c0e-..."
  }
]
```

## Chaining

```bash
# Get all connection IDs, then batch profile them
orbit get <id> connections --json | jq -r '.[].senditId' | xargs -I {} orbit profile {} --brief

# Get all source URLs
orbit get <id> sources --json | jq -r '.[].url'

# Get facts for a specific category
orbit get <id> facts --json | jq '[.[] | select(.labels[] == "work_history")]'
```
