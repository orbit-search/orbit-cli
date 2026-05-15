---
sidebar_position: 3
---

# Authentication

Orbit search and `orbit me` require an API key. Profile lookups by profile ID can be used where the public profile endpoint is available.

Anonymous search mode has been removed. Existing installs should run `orbit login` or set `ORBIT_API_KEY`.

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

# Direct — save key and app metadata together
orbit login --key sk_orb_your_key_here --app-id <provided-app-id>
```

If your API access requires app metadata, add it to the same config file:

```json
{
  "apiKey": "sk_orb_your_key_here",
  "appId": "<provided-app-id>",
  "appVersion": "1.0.0"
}
```

You can set `ORBIT_APP_ID` and `ORBIT_APP_VERSION` instead of editing the config file.
If app metadata is required but missing, the CLI reports the missing setup instead of using a bundled default.

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
