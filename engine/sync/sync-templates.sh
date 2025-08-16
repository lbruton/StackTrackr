#!/bin/bash

# StackTrackr Engine - Template Synchronization System
# Automatically sync master protocols with deployment templates

set -e

STACKTRACKR_ROOT="/Volumes/DATA/GitHub/StackTrackr"
ENGINE_DIR="$STACKTRACKR_ROOT/engine"
TEMPLATES_DIR="$ENGINE_DIR/templates"

echo "🔄 Synchronizing StackTrackr Engine Templates..."

# Master source files that should be synced (source:template pairs)
SYNC_FILES=(
    "agents/agents.ai:agents.ai"
    "agents/QUICK-AGENT-PROTOCOLS.ai:QUICK-AGENT-PROTOCOLS.ai"
    "agents/unified-workflow.ai:unified-workflow.ai"
    "docs/evening-work-session-protocol.md:evening-work-session-protocol.md"
    "scripts/mcp_backup_system.py:mcp_backup_system.py"
    "scripts/backup_mcp_memory.sh:backup_mcp_memory.sh"
    "scripts/sync_memory.sh:sync_memory.sh"
    "COPILOT_INSTRUCTIONS.md:COPILOT_INSTRUCTIONS.md"
)

# Create timestamp for change tracking
SYNC_TIME=$(date '+%Y-%m-%d %H:%M:%S')
SYNCED_COUNT=0

# Sync each master file to templates
for sync_pair in "${SYNC_FILES[@]}"; do
    source_file="${sync_pair%:*}"
    template_file="${sync_pair#*:}"
    source_path="$STACKTRACKR_ROOT/$source_file"
    template_path="$TEMPLATES_DIR/$template_file"
    
    if [ -f "$source_path" ]; then
        # Check if file has changed
        if [ ! -f "$template_path" ] || ! cmp -s "$source_path" "$template_path"; then
            cp "$source_path" "$template_path"
            echo "  ✅ Synced: $source_file → templates/$template_file"
            SYNCED_COUNT=$((SYNCED_COUNT + 1))
        else
            echo "  📋 No change: $template_file"
        fi
    else
        echo "  ⚠️  Missing source: $source_file"
    fi
done

# Update deployment scripts to use templates
echo "🔧 Updating deployment scripts..."

# Update full deployment script source path
sed -i.bak 's|SOURCE_PROJECT="/Volumes/DATA/GitHub/StackTrackr"|SOURCE_PROJECT="/Volumes/DATA/GitHub/StackTrackr/engine/templates"|g' "$ENGINE_DIR/deployment/deploy-agent-framework.sh" 2>/dev/null || true
rm -f "$ENGINE_DIR/deployment/deploy-agent-framework.sh.bak"

# Create version tracking
cat > "$ENGINE_DIR/sync/last_sync.json" << EOF
{
    "last_sync": "$SYNC_TIME",
    "synced_files": [
$(for sync_pair in "${SYNC_FILES[@]}"; do echo "        \"${sync_pair%:*}\","; done | sed '$ s/,$//')
    ],
    "template_count": ${#SYNC_FILES[@]},
    "synced_count": $SYNCED_COUNT,
    "engine_version": "1.0"
}
EOF

# Create sync log entry
echo "[$SYNC_TIME] Template sync completed - $SYNCED_COUNT/${#SYNC_FILES[@]} files updated" >> "$ENGINE_DIR/sync/sync.log"

echo ""
echo "🎯 Engine Templates Updated!"
echo "📊 Synced $SYNCED_COUNT of ${#SYNC_FILES[@]} master files"
echo "📍 Templates location: $TEMPLATES_DIR"
echo "📝 Sync log: $ENGINE_DIR/sync/sync.log"
echo ""
echo "💡 Next: Run deployment scripts from engine/deployment/"
