#!/bin/bash
# Sync local_memory.json with GitHub

# Commit changes
git add local_memory.json
git commit -m "Auto-sync local memory file"

# Push changes
git push origin main

# Pull latest changes
git pull origin main

echo "Memory file synchronized successfully."
