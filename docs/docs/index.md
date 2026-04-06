---
slug: /
sidebar_position: 1
---

# Orbit

Orbit is a people search engine. Search for anyone by name, profession, company, location, or natural language query — and get back structured profiles with work history, education, accomplishments, social links, connections, and more.

The **Orbit CLI** gives you terminal access to the entire Orbit graph. The **Orbit API** lets you integrate people data into any application.

## What can you do with Orbit?

- **Look up anyone** — `orbit lookup "Sam Altman"` returns a full dossier
- **Search by criteria** — `orbit search "engineers at Stripe"` finds people by company, role, location, interests
- **Explore networks** — `orbit connections <id>` lists someone's connections, each with an ID you can expand
- **Compare people** — `orbit compare <idA> <idB>` finds shared connections, companies, and schools
- **Power agents and tools** — structured JSON output (`--json`) feeds directly into AI agents, scripts, and pipelines

## Quick Start

```bash
# Install
git clone https://github.com/orbit-search/orbit-cli.git
cd orbit-cli && npm install && npm run build && npm link

# Search
orbit search "dentists in Miami"

# Full profile from a name
orbit lookup "Mark Zuckerberg"

# Authenticate for better results
orbit login --key sk_orb_your_key_here
orbit me
```

## Next Steps

- [Installation](/installation) — setup and requirements
- [Authentication](/authentication) — API keys and auth modes
- [CLI Reference](/cli/search) — all commands
- [API Reference](/api/overview) — HTTP endpoints
- [Search Patterns](/guides/search-patterns) — get the most out of search
