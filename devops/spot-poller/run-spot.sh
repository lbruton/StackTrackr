#!/bin/bash
# StakTrakr Spot Poller — wrapper for Fly.io
# Runs Python poller in background, commits and pushes every hour

set -e

API_DATA_REPO="${API_DATA_REPO:-https://github.com/lbruton/StakTrakrApi.git}"
API_EXPORT_DIR="${API_EXPORT_DIR:-/tmp/staktrakr-api-export}"
BRANCH="main"
COMMIT_INTERVAL=3600  # Commit every hour (matches POLL_INTERVAL_SECONDS)

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

# Function to commit and push changes
commit_and_push() {
  cd "$API_EXPORT_DIR"
  git add data/ 2>/dev/null || true
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "spot-poller: $(date -u +%Y-%m-%d\ %H:%M) update" 2>/dev/null || true
    git push --force-with-lease "https://${GITHUB_TOKEN}@github.com/lbruton/StakTrakrApi.git" "$BRANCH" 2>/dev/null && \
      echo "[$(date -u +%Y-%m-%d\ %H:%M:%S)] Pushed to $BRANCH branch" || \
      echo "[$(date -u +%Y-%m-%d\ %H:%M:%S)] Push failed (will retry next cycle)"
  else
    echo "[$(date -u +%Y-%m-%d\ %H:%M:%S)] No changes to commit"
  fi
}

# Start Python poller in background
cd /app
python3 -u poller.py &
POLLER_PID=$!

# Commit loop — runs every hour to push new data
while true; do
  sleep "$COMMIT_INTERVAL"
  commit_and_push

  # Check if poller is still running
  if ! kill -0 "$POLLER_PID" 2>/dev/null; then
    echo "Poller process died, exiting commit loop"
    break
  fi
done

# Final commit on exit
commit_and_push
wait "$POLLER_PID"
