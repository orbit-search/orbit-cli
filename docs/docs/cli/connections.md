---
sidebar_position: 4
---

# orbit connections

List all first-degree connections for a person. Each connection includes their user ID, so you can chain into `orbit profile` to explore the network.

## Usage

```bash
orbit connections <userId> [options]
```

## Options

| Flag | Description | Default |
|---|---|---|
| `-j, --json` | Output structured JSON | off |
| `-n, --limit <n>` | Max connections to show | all |

## Examples

```bash
# All connections
orbit connections a7b7449d-3b89-4bf1-95fc-183e831f31cc

# First 5 only
orbit connections a7b7449d-3b89-4bf1-95fc-183e831f31cc --limit 5

# JSON for scripting
orbit connections a7b7449d-3b89-4bf1-95fc-183e831f31cc --json
```

## Output

```
Nicholas Vinicius Dominici — 50 connections

  Garrison R Magyar  [00a08c0e-e773-4f11-88bf-fd3092ecc721]
  Savannah Miata  [0325971c-740a-49dc-a2be-4a44240ed131]
  Amanda Mackenzie Carney  [03d99232-d60f-4f77-9bf6-53f352e02c3e]
  Luiz Schiel  [03ff65fc-45d0-416b-b4d2-22c1da0b5409]
  Bastian Behrens  [04f3ab2f-e56e-4db5-a823-df06f87dbe0c]

  ... 45 more (use --limit to show more)
```

## JSON Output

```json
[
  {
    "senditId": "00a08c0e-e773-4f11-88bf-fd3092ecc721",
    "fullName": "Garrison R Magyar",
    "avatarUrl": null,
    "link": "https://orbitsearch.com/00a08c0e-e773-4f11-88bf-fd3092ecc721"
  }
]
```

## Chaining

Expand any connection into a full profile:

```bash
# Get connections, then profile the first one
orbit connections <id> --json | jq -r '.[0].senditId' | xargs orbit profile

# Batch brief profiles for all connections
orbit connections <id> --json | jq -r '.[].senditId' | xargs -I {} orbit profile {} --brief
```
