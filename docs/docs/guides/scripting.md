---
sidebar_position: 2
---

# Scripting & Piping

Every command supports `--json` output for easy integration with `jq`, scripts, and other tools.

## Basic Patterns

### Search → Profile

```bash
# Get first result's ID, then full profile
orbit search "Sam Altman" --first --json | jq -r '.[0].userId' | xargs orbit profile
```

### Batch Profile Lookups

```bash
# Profile every connection
orbit connections <id> --json | jq -r '.[].senditId' | xargs -I {} orbit profile {} --brief
```

### Extract Specific Fields

```bash
# Just work history
orbit profile <id> --json | jq '.jobs'

# Just social links
orbit profile <id> --json | jq '.socialLinks'

# All connection names
orbit connections <id> --json | jq -r '.[].fullName'
```

### Compare Yourself to Someone

```bash
ME=$(orbit me --json | jq -r '.userId')
orbit compare $ME <otherUserId>
```

## Building with the API

### Search and Collect

```bash
# Search and save all results
orbit search "VCs in San Francisco" --json > vcs.json

# Loop through and get full profiles
cat vcs.json | jq -r '.[].userId' | while read id; do
  orbit profile "$id" --json > "profiles/$id.json"
  sleep 1  # be nice to the API
done
```

### Network Mapping

```bash
# Get someone's connections, then get each connection's connections
orbit connections <id> --json | jq -r '.[].senditId' | head -10 | while read cid; do
  echo "=== Connections of $(orbit profile $cid --json | jq -r '.displayName') ==="
  orbit connections "$cid" --limit 5
  echo ""
done
```

### Find Mutual Connections

```bash
# Compare two people and extract shared connections as JSON
orbit compare <idA> <idB> --json | jq '.shared.connections[].fullName'
```

## Output Formats

| Flag | Format | Use for |
|---|---|---|
| (none) | Human-readable text | Terminal reading |
| `--brief` | 4-line summary | Quick scanning |
| `--json` | Structured JSON | Scripts, piping, agents |

## Error Handling

Commands exit with code 1 on failure. Check exit codes in scripts:

```bash
if orbit search "query" --first --json > /dev/null 2>&1; then
  echo "Found results"
else
  echo "No results or error"
fi
```
