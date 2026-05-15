---
sidebar_position: 6
---

# orbit me

Get your own profile. Requires [authentication](/authentication) with an API key.

## Usage

```bash
orbit me [options]
```

## Options

| Flag | Description |
|---|---|
| `-j, --json` | Output structured JSON |
| `-b, --brief` | Short 4-line summary |

## Examples

```bash
orbit me
orbit me --brief
orbit me --json
```

## How It Works

1. Calls `GET /v1/profile` with your API key to resolve your profile ID
2. Fetches your full profile from the public profile endpoint
3. Formats and displays it

This is the same data as `orbit profile <yourId>` — just without needing to know your ID.

## Requires Auth

If you haven't authenticated:

```
Not authenticated. Run `orbit login` first.
```

If your API access requires app metadata, add `appId` to `~/.orbit-cli/config.json` or set `ORBIT_APP_ID`.
