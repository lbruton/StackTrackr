#!/bin/bash
# StakTrakr Spot Poller — wrapper for Fly.io
# Clones StakTrakrApi repo, runs Python poller, commits and pushes

set -e

API_DATA_REPO="${API_DATA_REPO:-https://github.com/lbruton/StakTrakrApi.git}"
API_EXPORT_DIR="${API_EXPORT_DIR:-/tmp/staktrakr-api-export}"
BRANCH="spot-data"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN not set"
  exit 1
fi

# Clone/update StakTrakrApi repo
if [ ! -d "$API_EXPORT_DIR" ]; then
  echo "Cloning StakTrakrApi repo..."
  git clone "https://${GITHUB_TOKEN}@github.com/lbruton/StakTrakrApi.git" "$API_EXPORT_DIR"
fi

cd "$API_EXPORT_DIR"
git fetch origin "$BRANCH" 2>/dev/null || true
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"
git pull origin "$BRANCH" 2>/dev/null || true

# Create data directory structure
mkdir -p data/spot-history data/hourly

# Run the Python poller (writes to $API_EXPORT_DIR/data)
cd /app
python3 -u poller.py

# The poller runs continuously, so this only executes if it exits
# Commit and push any changes
cd "$API_EXPORT_DIR"
git add data/
if git diff --cached --quiet; then
  echo "No changes to commit"
else
  git commit -m "spot-poller: $(date -u +%Y-%m-%d\ %H:%M) update"
  git push --force-with-lease "https://${GITHUB_TOKEN}@github.com/lbruton/StakTrakrApi.git" "$BRANCH"
  echo "Pushed to $BRANCH branch"
fi
