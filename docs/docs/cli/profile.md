---
sidebar_position: 3
---

# orbit profile

Get a detailed profile for a person by their user ID.

## Usage

```bash
orbit profile <userId> [options]
```

## Options

| Flag | Description |
|---|---|
| `-j, --json` | Output structured JSON |
| `-b, --brief` | Short 4-line summary |

## Examples

```bash
# Full profile
orbit profile a7b7449d-3b89-4bf1-95fc-183e831f31cc

# Brief summary
orbit profile a7b7449d-3b89-4bf1-95fc-183e831f31cc --brief

# JSON output
orbit profile a7b7449d-3b89-4bf1-95fc-183e831f31cc --json
```

## Default Output

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
    As the Director of Innovation, I lead our efforts in pioneering...
  src: https://grokipedia.com/...

ACCOMPLISHMENTS
  Created Viral Vogue Lens Amassing 2.4 Billion Views
  Led AR Development for Sendit Achieving 17 Billion Impressions
  src: https://grokipedia.com/... https://arvrjourney.com/...

PASSIONS
  Creating Snapchat AR lenses: Creates diverse Lenses including...
  Gaming: Describes himself as a Gamer...

PERSONAL LIFE
  Born in Hyannis, Massachusetts.

BEST QUALITIES
  Innovative, Collaborative, Ethically Minded

SOCIAL
  linkedin: nicholas-dominici-110b4a178 | github: NicholasDominici

CONNECTIONS (50)
  Garrison R Magyar [00a08c0e-e773-4f11-88bf-fd3092ecc721]
  Savannah Miata [0325971c-740a-49dc-a2be-4a44240ed131]
  ...
  +40 more
```

## Brief Output

```bash
orbit profile <userId> --brief
```

```
Nicholas Vinicius Dominici | 23 | Santa Monica, CA
Currently based in Santa Monica, Nicholas Dominici is a Director...
Work: Orbit Intelligence (2026-Present), Iconic Hearts (2024-2026)
linkedin: nicholas-dominici-110b4a178 | github: NicholasDominici
```

## Sections

Each profile contains these sections (when data is available):

| Section | Content |
|---|---|
| Header | Name, age, birthday, location, Orbit link |
| Bio | AI-generated summary with source URLs |
| Skills | Technical and professional skills |
| Locations | Current and previous locations |
| Work | Job history with companies, titles, descriptions, date ranges |
| Education | Schools with date ranges |
| Accomplishments | Notable achievements |
| Controversies | Public controversies |
| Passions | Interests with descriptions |
| Personal Life | Background, birthplace, traits |
| Best Qualities | Positive traits |
| Worldview | Politics, religion, causes |
| Social | LinkedIn, GitHub, Twitter, Instagram, etc. |
| Connections | First-degree connections with user IDs |

Each section that has data includes `src:` lines with source URLs (deduped by domain, max 5).

## Getting User IDs

User IDs come from:
- `orbit search` results (shown in brackets)
- `orbit connections` output
- `orbit me --json` (your own ID)
