#!/bin/bash

# Memory Vault Pull Script
# Pulls shared memory from private memory-vault repository

echo "🔄 Memory Vault Pull System"
echo "========================="

# Configuration
VAULT_REPO="https://github.com/lbruton/memory-vault.git"
VAULT_DIR="../memory-vault"
PROJECT_NAME="StackTrackr"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📁 Project:${NC} $PROJECT_NAME"
echo -e "${BLUE}⏰ Timestamp:${NC} $TIMESTAMP"

# Function to clone or update vault repository
setup_vault_repo() {
    echo -e "${YELLOW}🔄 Setting up vault repository...${NC}"
    
    if [ ! -d "$VAULT_DIR" ]; then
        echo -e "${BLUE}📥 Cloning memory-vault repository...${NC}"
        git clone "$VAULT_REPO" "$VAULT_DIR"
    else
        echo -e "${BLUE}🔄 Updating memory-vault repository...${NC}"
        cd "$VAULT_DIR"
        git pull origin main
        cd - > /dev/null
    fi
}

# Function to pull shared memory from vault
pull_from_vault() {
    echo -e "${YELLOW}📥 Pulling shared memory from vault...${NC}"
    
    # Create local directories
    mkdir -p "backups/shared_memory"
    mkdir -p "docs/shared"
    
    # Pull memory files from other projects
    echo -e "${BLUE}📂 Available projects in vault:${NC}"
    ls "$VAULT_DIR/projects/" 2>/dev/null || echo "No projects found"
    
    # Copy shared memory files
    for project_dir in "$VAULT_DIR/projects"/*; do
        if [ -d "$project_dir" ]; then
            project=$(basename "$project_dir")
            echo -e "${BLUE}  📁 $project${NC}"
            
            # Copy latest memory
            if [ -f "$project_dir/memory_latest.json" ]; then
                cp "$project_dir/memory_latest.json" "backups/shared_memory/${project}_memory.json"
                echo -e "${GREEN}    ✅ Memory synced${NC}"
            fi
            
            # Copy latest roadmap
            if [ -f "$project_dir/roadmap_"*.md ]; then
                latest_roadmap=$(ls -t "$project_dir/roadmap_"*.md | head -1)
                cp "$latest_roadmap" "docs/shared/${project}_roadmap.md"
                echo -e "${GREEN}    ✅ Roadmap synced${NC}"
            fi
        fi
    done
}

# Function to merge memories
merge_memories() {
    echo -e "${YELLOW}🔄 Creating shared memory index...${NC}"
    
    cat > "backups/shared_memory/index.json" << EOF
{
    "lastSync": "$TIMESTAMP",
    "availableProjects": [
$(ls "$VAULT_DIR/projects/" 2>/dev/null | sed 's/^/        "/' | sed 's/$/",/' | sed '$s/,$//')
    ],
    "instructions": {
        "usage": "This directory contains shared memory from all projects",
        "memoryFiles": "Each project has a {project}_memory.json file",
        "roadmaps": "Project roadmaps are in docs/shared/{project}_roadmap.md",
        "integration": "Use these files when MCP memory is unavailable or for cross-project context"
    }
}
EOF

    echo -e "${GREEN}✅ Shared memory index created${NC}"
}

# Function to create integration guide
create_integration_guide() {
    echo -e "${YELLOW}📝 Creating integration guide...${NC}"
    
    cat > "docs/SHARED_MEMORY_GUIDE.md" << EOF
# Shared Memory Integration Guide

## Overview
This project now has access to shared memory from the private memory-vault repository.

## Directory Structure
\`\`\`
backups/shared_memory/           # Shared memory from all projects
├── index.json                  # Index of available projects
├── StackTrackr_memory.json     # StackTrackr memory export
├── VulnTrackr_memory.json      # VulnTrackr memory export  
└── rEngine_memory.json         # rEngine memory export

docs/shared/                     # Shared documentation
├── StackTrackr_roadmap.md      # StackTrackr roadmap
├── VulnTrackr_roadmap.md       # VulnTrackr roadmap
└── rEngine_roadmap.md          # rEngine roadmap
\`\`\`

## Usage for AI Agents

### When MCP Memory is Available
- Use normal MCP tools to access current project memory
- Cross-reference with shared memory for context from other projects

### When MCP Memory is Unavailable  
- Read \`backups/shared_memory/{project}_memory.json\` for project-specific context
- Read \`docs/shared/{project}_roadmap.md\` for current project status
- Use \`backups/shared_memory/index.json\` to see available projects

### Syncing Commands
\`\`\`bash
# Push current memory to vault
./scripts/sync_memory_to_vault.sh

# Pull shared memory from vault  
./scripts/sync_memory_from_vault.sh
\`\`\`

## Best Practices
1. Sync to vault after major changes or at end of session
2. Pull from vault at start of new session for latest context
3. Check shared memory when working on cross-project features
4. Use shared roadmaps to understand dependencies between projects

## Automated Integration
- Scripts automatically create backup directories
- Memory files are timestamped for version tracking
- Integration works whether you're in individual project folders or shared workspace
EOF

    echo -e "${GREEN}✅ Integration guide created${NC}"
}

# Main execution
echo -e "${BLUE}🚀 Starting memory vault pull...${NC}"

setup_vault_repo
pull_from_vault
merge_memories
create_integration_guide

echo ""
echo -e "${GREEN}✅ Memory Vault Pull Complete!${NC}"
echo -e "${BLUE}📍 Shared memory location:${NC} backups/shared_memory/"
echo -e "${BLUE}📍 Shared docs location:${NC} docs/shared/"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "  - Check docs/SHARED_MEMORY_GUIDE.md for usage instructions"
echo "  - Use shared memory files when MCP tools are unavailable"
echo "  - Run sync_memory_to_vault.sh to share your changes"
