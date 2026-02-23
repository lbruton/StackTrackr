#!/usr/bin/env python3
"""
merge-seed.py — Merge live API spot-history data into local seed file.

Usage: python3 merge-seed.py <local_path> <remote_path>

- Deduplicates by (timestamp, metal) composite key
- Remote entries win on conflict (live API is authoritative)
- Writes merged array back to local_path, sorted by timestamp
- Prints summary: filename: +N new entries from live
"""
import json
import os
import sys
import tempfile
from pathlib import Path


def main():
    if len(sys.argv) != 3:
        print("Usage: merge-seed.py <local_path> <remote_path>", file=sys.stderr)
        sys.exit(1)

    local_path = Path(sys.argv[1])
    remote_path = Path(sys.argv[2])

    try:
        with open(local_path) as f:
            local_entries = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: could not parse {local_path}: {e}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(local_entries, list):
        print(f"Error: {local_path} is not a JSON array", file=sys.stderr)
        sys.exit(1)

    try:
        with open(remote_path) as f:
            remote_entries = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: could not parse {remote_path}: {e}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(remote_entries, list):
        print(f"Error: {remote_path} does not contain a JSON array — aborting to protect local file", file=sys.stderr)
        sys.exit(1)

    # Build index keyed by (timestamp, metal) — remote wins on conflict
    index = {}
    for entry in local_entries:
        ts = entry.get("timestamp")
        metal = entry.get("metal")
        if ts is None or metal is None:
            print(f"Warning: skipping malformed local entry (missing timestamp or metal): {entry}", file=sys.stderr)
            continue
        key = (ts, metal)
        index[key] = entry

    original_count = len(index)

    new_count = 0
    for entry in remote_entries:
        ts = entry.get("timestamp")
        metal = entry.get("metal")
        if ts is None or metal is None:
            print(f"Warning: skipping malformed remote entry (missing timestamp or metal): {entry}", file=sys.stderr)
            continue
        key = (ts, metal)
        if key not in index:
            new_count += 1
        index[key] = entry  # remote always wins

    # Sort by timestamp (ascending), then by metal for stable order
    merged = sorted(index.values(), key=lambda e: (e.get("timestamp", ""), e.get("metal", "")))

    # Atomic write: write to a .tmp file, then replace the target
    tmp_fd, tmp_path = tempfile.mkstemp(dir=local_path.parent, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w") as f:
            json.dump(merged, f, indent=2)
            f.write("\n")
        os.replace(tmp_path, local_path)
    except Exception as e:
        os.unlink(tmp_path)
        print(f"Error: failed to write {local_path}: {e}", file=sys.stderr)
        raise

    print(f"{local_path.name}: +{new_count} new entries from live (total: {len(merged)})")


if __name__ == "__main__":
    main()
