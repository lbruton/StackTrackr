#!/usr/bin/env bash
set -e

# Maintains the last three archived builds of the project.
# Archives are stored under archive/ as v_previous, v_previous2, and v_previous3.

ARCHIVE_DIR="archive"

# Remove oldest archive if it exists
if [ -d "$ARCHIVE_DIR/v_previous3" ]; then
  rm -rf "$ARCHIVE_DIR/v_previous3"
fi

# Shift existing archives
if [ -d "$ARCHIVE_DIR/v_previous2" ]; then
  mv "$ARCHIVE_DIR/v_previous2" "$ARCHIVE_DIR/v_previous3"
fi
if [ -d "$ARCHIVE_DIR/v_previous" ]; then
  mv "$ARCHIVE_DIR/v_previous" "$ARCHIVE_DIR/v_previous2"
fi

# Create new archive directory
mkdir -p "$ARCHIVE_DIR/v_previous"

# Copy current build excluding version archives and git data
rsync -a --exclude "$ARCHIVE_DIR/" --exclude ".git/" ./ "$ARCHIVE_DIR/v_previous"
