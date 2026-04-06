---
sidebar_position: 3
---

# Authentication

Orbit works in two modes: **anonymous** and **authenticated**.

## Anonymous Mode

Works out of the box. Supports `orbit search` and `orbit profile` using service keys. No setup needed.

Limitations:
- Search uses a shared service account
- `orbit me` is not available

## Authenticated Mode

Uses your personal API key for better search results, match reasoning, and access to `orbit me`.

### Get an API Key

1. Go to [orbitsearch.com](https://orbitsearch.com)
2. Sign in → Settings → Create API key
3. Copy the key (starts with `sk_orb_`)

### Log In

```bash
# Interactive — opens browser or prompts for key
orbit login

# Direct — pass key inline
orbit login --key sk_orb_your_key_here
```

### Check Status

```bash
orbit whoami
# ✓ Authenticated
#   Key: sk_orb_2016f3...
```

### Log Out

```bash
orbit logout
# ✓ Logged out. API key removed.
```

## How Auth Works

Authenticated requests send the API key as a Bearer token:

```
Authorization: Bearer sk_orb_your_key_here
```

The key is stored locally at `~/.orbit-cli/config.json` and never sent anywhere except the Orbit API.
