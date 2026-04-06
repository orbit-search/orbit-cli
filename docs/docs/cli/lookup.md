---
sidebar_position: 2
---

# orbit lookup

Search for a person and immediately show the full profile of the top result. Combines `orbit search --first` and `orbit profile` in one command.

## Usage

```bash
orbit lookup <query> [options]
```

## Options

| Flag | Description |
|---|---|
| `-j, --json` | Output structured JSON |
| `-b, --brief` | Short 4-line summary |

## Examples

```bash
# Full profile
orbit lookup "Mark Zuckerberg"

# Brief summary
orbit lookup "Elon Musk" --brief

# JSON for scripting
orbit lookup "Sam Altman" --json
```

## Output

Same as `orbit profile` — see [orbit profile](/cli/profile) for format details.

## When to Use

Use `orbit lookup` when you have a name and want the full profile in one shot. If you need to pick from multiple results first, use `orbit search` then `orbit profile`.
