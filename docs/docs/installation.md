---
sidebar_position: 2
---

# Installation

## Requirements

- Node.js >= 18
- npm

## Install from Source

```bash
git clone https://github.com/orbit-search/orbit-cli.git
cd orbit-cli
npm install
npm run build
npm link
```

This makes the `orbit` command available globally.

## Verify Installation

```bash
orbit --version
# 2.1.0

orbit --help
```

## Update

```bash
cd orbit-cli
git pull origin main
npm run build
```

## Configuration

Config is stored at `~/.orbit-cli/config.json`:

```json
{
  "apiKey": "sk_orb_...",
  "appId": "<provided-app-id>",
  "appVersion": "1.0.0"
}
```

This file is created automatically when you run `orbit login`.
Some API environments also require app metadata. Existing installs can add `appId` or set `ORBIT_APP_ID` without changing their API key.
The app ID is issued with your API access. If you have an API key but no app ID, request one from your Orbit workspace administrator or support contact.

You can also save both values in one command:

```bash
orbit login --key sk_orb_your_key --app-id <provided-app-id> --app-version 1.0.0
```

When rotating a key, `orbit login --key ...` keeps existing app metadata and clears saved request context if the key changes. Pass `--app-id` to replace app metadata, `--app-version` to pin a version with the new app ID, or `--clear-app-id` to remove both app metadata and saved request context.

If app metadata is required but missing, the CLI reports the missing setup instead of using a bundled default.
