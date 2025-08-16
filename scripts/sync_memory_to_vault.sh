#!/bin/bash

# Memory Vault Sync Script
# Syncs local MCP memory to private memory-vault repository

echo "🔄 Memory Vault Sync System"
echo "=========================="

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

# Function to export current MCP memory
export_mcp_memory() {
    echo -e "${YELLOW}📤 Exporting MCP memory...${NC}"
    
    # Create local backup first
    mkdir -p "backups/mcp_memory"
    
    # Export current memory (this would use MCP tools in real implementation)
    echo "Memory export would happen here using MCP tools"
    echo "For now, using existing memory_export.json"
    
    if [ -f "memory_export.json" ]; then
        cp "memory_export.json" "backups/mcp_memory/memory_${TIMESTAMP}.json"
        echo -e "${GREEN}✅ Memory exported to backups/${NC}"
    else
        echo -e "${YELLOW}⚠️  No memory_export.json found${NC}"
    fi
}

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

# Function to sync memory to vault
sync_to_vault() {
    echo -e "${YELLOW}📤 Syncing memory to vault...${NC}"
    
    # Create project directory in vault
    mkdir -p "$VAULT_DIR/projects/$PROJECT_NAME"
    mkdir -p "$VAULT_DIR/projects/$PROJECT_NAME/backups"
    mkdir -p "$VAULT_DIR/projects/$PROJECT_NAME/sessions"
    
    # Copy memory files
    if [ -f "memory_export.json" ]; then
        cp "memory_export.json" "$VAULT_DIR/projects/$PROJECT_NAME/memory_latest.json"
        cp "memory_export.json" "$VAULT_DIR/projects/$PROJECT_NAME/backups/memory_${TIMESTAMP}.json"
    fi
    
    if [ -f "local_memory.json" ]; then
        cp "local_memory.json" "$VAULT_DIR/projects/$PROJECT_NAME/local_memory_latest.json"
    fi
    
    # Copy roadmap and documentation
    if [ -f "docs/roadmap.md" ]; then
        cp "docs/roadmap.md" "$VAULT_DIR/projects/$PROJECT_NAME/roadmap_${TIMESTAMP}.md"
    fi
    
    # Create sync metadata
    cat > "$VAULT_DIR/projects/$PROJECT_NAME/sync_metadata.json" << EOF
{
    "project": "$PROJECT_NAME",
    "lastSync": "$TIMESTAMP",
    "syncType": "manual",
    "files": {
        "memory": "memory_latest.json",
        "localMemory": "local_memory_latest.json",
        "roadmap": "roadmap_${TIMESTAMP}.md"
    }
}
EOF
    
    echo -e "${GREEN}✅ Files synced to vault${NC}"
}

# Function to commit and push to vault
commit_to_vault() {
    echo -e "${YELLOW}📤 Committing to vault repository...${NC}"
    
    cd "$VAULT_DIR"
    
    # Add all changes
    git add .
    
    # Commit with descriptive message
    git commit -m "Sync $PROJECT_NAME memory - $TIMESTAMP

- Updated memory export
- Updated local memory
- Synced roadmap and documentation
- Generated sync metadata"
    
    # Push to remote
    git push origin main
    
    echo -e "${GREEN}✅ Memory synced to private vault repository${NC}"
    
    cd - > /dev/null
}

# Main execution
echo -e "${BLUE}🚀 Starting memory vault sync...${NC}"

export_mcp_memory
setup_vault_repo
sync_to_vault
commit_to_vault

echo ""
echo -e "${GREEN}✅ Memory Vault Sync Complete!${NC}"
echo -e "${BLUE}📍 Vault location:${NC} $VAULT_DIR"
echo -e "${BLUE}🌐 Remote repository:${NC} $VAULT_REPO"
echo ""
echo -e "${YELLOW}💡 Usage:${NC}"
echo "  - Run this script from any project to sync memory to vault"
echo "  - Use sync_memory_from_vault.sh to pull shared memory"
echo "  - All projects can access shared memory through the vault"
