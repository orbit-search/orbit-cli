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
  "apiKey": "sk_orb_..."
}
```

This file is created automatically when you run `orbit login`.
