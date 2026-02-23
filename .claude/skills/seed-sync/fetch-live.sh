#!/usr/bin/env bash
# Phase 5: Sync from Live API
# Fetches spot-history JSON from api.staktrakr.com and merges into local seed files.
# Usage: bash .claude/skills/seed-sync/fetch-live.sh (run from repo root)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

CURRENT_YEAR=$(date +%Y)
TMPFILES=()
trap 'rm -f "${TMPFILES[@]}"' EXIT

for year in $(seq 2023 "$CURRENT_YEAR"); do
  url="https://api.staktrakr.com/data/spot-history-${year}.json"
  tmpfile=$(mktemp /tmp/live-${year}-XXXXXX.json)
  TMPFILES+=("$tmpfile")
  local_file="${REPO_ROOT}/data/spot-history-${year}.json"

  if ! curl -sf --max-time 30 "$url" -o "$tmpfile"; then
    echo "⚠️  Could not fetch ${year} from live API — skipping"
    continue
  fi

  # Verify the response is a JSON array before merging
  if ! python3 -c "import json,sys; d=json.load(open(sys.argv[1])); assert isinstance(d,list)" "$tmpfile" 2>/dev/null; then
    echo "⚠️  ${year}: remote response is not a JSON array — skipping"
    continue
  fi

  if [ ! -f "$local_file" ]; then
    echo "⚠️  Local file not found: $local_file — skipping"
    continue
  fi

  if ! python3 "${SCRIPT_DIR}/merge-seed.py" "$local_file" "$tmpfile"; then
    echo "⚠️  ${year}: merge failed — skipping (local file unchanged)"
    continue
  fi
done
