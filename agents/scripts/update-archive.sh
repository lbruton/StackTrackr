#!/usr/bin/env bash
set -e

ARCHIVE_DIR="archive"
TARGET="$ARCHIVE_DIR/v_previous"

# Remove existing archive directory
rm -rf "$TARGET"
mkdir -p "$TARGET"

# Copy current build excluding archives and git data
rsync -a --exclude "$ARCHIVE_DIR/" --exclude ".git/" ./ "$TARGET"

# Ensure archived footer links back to current build
if [ -f "$TARGET/index.html" ]; then
  sed -i 's|./archive/v_previous/index.html|../index.html|' "$TARGET/index.html"
  sed -i 's|Previous build|Current build|' "$TARGET/index.html"
fi
