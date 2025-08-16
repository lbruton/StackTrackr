#!/bin/bash

# Copy Memory Sync Scripts to All Projects
# Ensures all projects have the same memory vault sync capabilities

echo "🔄 Deploying Memory Sync Scripts"
echo "==============================="

# Projects to sync
PROJECTS=(
    "/Volumes/DATA/GitHub/rEngine"
    "/Volumes/DATA/GitHub/VulnTrackr"
)

SOURCE_DIR="/Volumes/DATA/GitHub/StackTrackr/scripts"
SCRIPTS=(
    "sync_memory_to_vault.sh"
    "sync_memory_from_vault.sh"
)

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📁 Source:${NC} $SOURCE_DIR"
echo -e "${BLUE}📜 Scripts:${NC} ${SCRIPTS[*]}"

for project in "${PROJECTS[@]}"; do
    if [ -d "$project" ]; then
        echo ""
        echo -e "${YELLOW}📁 Project:${NC} $(basename "$project")"
        
        # Create scripts directory if it doesn't exist
        mkdir -p "$project/scripts"
        
        # Copy each script
        for script in "${SCRIPTS[@]}"; do
            if [ -f "$SOURCE_DIR/$script" ]; then
                # Update PROJECT_NAME in the script for this project
                project_name=$(basename "$project")
                sed "s/PROJECT_NAME=\"StackTrackr\"/PROJECT_NAME=\"$project_name\"/" "$SOURCE_DIR/$script" > "$project/scripts/$script"
                chmod +x "$project/scripts/$script"
                echo -e "${GREEN}  ✅ $script${NC}"
            else
                echo -e "${YELLOW}  ⚠️  $script not found${NC}"
            fi
        done
        
        # Create project-specific documentation
        cat > "$project/docs/MEMORY_VAULT_SETUP.md" << EOF
# Memory Vault Setup for $(basename "$project")

## Quick Start
\`\`\`bash
# Push current memory to shared vault
./scripts/sync_memory_to_vault.sh

# Pull shared memory from vault
./scripts/sync_memory_from_vault.sh
\`\`\`

## What This Enables
- Work in individual project folders
- Share memory and context between all projects
- Access cross-project documentation and roadmaps
- Maintain MCP memory synchronization

## Directory Structure After Sync
\`\`\`
backups/shared_memory/           # Memory from all projects
docs/shared/                     # Cross-project documentation
docs/SHARED_MEMORY_GUIDE.md     # Integration instructions
\`\`\`

## When to Sync
- **Push to vault:** After major changes, bug fixes, or at end of session
- **Pull from vault:** At start of new session or when needing cross-project context

## Vault Repository
Private repository: https://github.com/lbruton/memory-vault
EOF
        
        echo -e "${GREEN}  ✅ Documentation created${NC}"
        
    else
        echo -e "${YELLOW}⚠️  Project not found:${NC} $project"
    fi
done

echo ""
echo -e "${GREEN}✅ Memory Sync Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW}💡 Each project now has:${NC}"
echo "  - scripts/sync_memory_to_vault.sh"
echo "  - scripts/sync_memory_from_vault.sh" 
echo "  - docs/MEMORY_VAULT_SETUP.md"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "  1. Test scripts in each project folder"
echo "  2. Run initial sync to populate vault"
echo "  3. Work normally in individual project folders"
echo "  4. Sync memories as needed for collaboration"
