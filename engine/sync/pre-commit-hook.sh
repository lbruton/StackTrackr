#!/bin/bash

# StackTrackr Engine - Auto-Sync Git Hook
# Automatically sync templates when agent protocol files are committed

# Files that trigger template sync
WATCH_FILES=(
    "agents/agents.ai"
    "agents/QUICK-AGENT-PROTOCOLS.ai"
    "agents/unified-workflow.ai"
    "docs/evening-work-session-protocol.md"
    "scripts/mcp_backup_system.py"
    "scripts/backup_mcp_memory.sh"
    "scripts/sync_memory.sh"
    "COPILOT_INSTRUCTIONS.md"
)

# Check if any watched files are being committed
NEEDS_SYNC=false
for file in "${WATCH_FILES[@]}"; do
    if git diff --cached --name-only | grep -q "^$file$"; then
        NEEDS_SYNC=true
        echo "🔄 Detected change in: $file"
        break
    fi
done

# Run template sync if needed
if [ "$NEEDS_SYNC" = true ]; then
    echo "🚀 Auto-syncing engine templates..."
    ./engine/sync/sync-templates.sh
    
    # Add synced templates to commit
    git add engine/templates/
    git add engine/sync/last_sync.json
    git add engine/sync/sync.log
    
    echo "✅ Templates automatically synchronized"
fi

exit 0
