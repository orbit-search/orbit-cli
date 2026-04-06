---
sidebar_position: 5
---

# orbit compare

Compare two people side-by-side. Shows brief profiles for both, then highlights what they have in common: shared connections, companies, schools, and skills.

## Usage

```bash
orbit compare <userIdA> <userIdB> [options]
```

## Options

| Flag | Description |
|---|---|
| `-j, --json` | Output structured JSON |

## Examples

```bash
# Compare two people
orbit compare a7b7449d-3b89-4bf1-95fc-183e831f31cc 074032de-2f1c-4c8d-b516-e2d84a4eec55

# JSON output
orbit compare <idA> <idB> --json
```

## Output

```
=== Nicholas Vinicius Dominici ===
Nicholas Vinicius Dominici | 23 | Santa Monica, CA
Currently based in Santa Monica...
Work: Orbit Intelligence (2026-Present), Iconic Hearts (2024-2026)
linkedin: nicholas-dominici-110b4a178 | github: NicholasDominici

=== Brandon Sears ===
Brandon Sears | Rockville, MD
Based in Rockville, Maryland...
Work: The Refined Choice (2024-Present), Scarlet Social (2018-Present)
linkedin: brandon-sears

=== In Common ===

Shared connections (3):
  William Gibson  [16a9bc07-...]
  Isaac Newell  [2a5f1c03-...]
  Jordyn Jones  [0500e75a-...]

Shared companies:
  Iconic Hearts (2019-2021)

Shared skills: Augmented Reality, JavaScript
```

## What Gets Compared

| Category | How it matches |
|---|---|
| Connections | Exact user ID overlap in first-degree connections |
| Companies | Normalized company name match (strips Inc/Corp/LLC) |
| Schools | Normalized school name match |
| Skills | Case-insensitive skill name match |

## JSON Output

```json
{
  "personA": { /* full ProfileDetails */ },
  "personB": { /* full ProfileDetails */ },
  "shared": {
    "connections": [{ "senditId": "...", "fullName": "..." }],
    "companies": ["Iconic Hearts"],
    "schools": [],
    "skills": ["Augmented Reality", "JavaScript"]
  }
}
```
