#!/bin/zsh
# This script automates the synchronization of tasks to rEngine

# Navigate to the StackTrackr directory
cd /Volumes/DATA/GitHub/StackTrackr

# Run the sync_tasks.py script
python3 scripts/sync_tasks.py

# Log the execution time
echo "Sync executed at $(date)" >> sync_log.txt
