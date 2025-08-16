#!/bin/bash

# Sync project data FROM rAgents repository  
# Downloads latest agent protocols, memory, and documentation from centralized hub

echo "🔄 rAgents Sync - Pull from Hub"
echo "==============================="

# Load project configuration
if [ ! -f ".ragents" ]; then
    echo "❌ .ragents file not found. Run from project root."
    exit 1
fi

PROJECT_NAME=$(grep '"name":' .ragents | cut -d'"' -f4)
RAGENTS_REPO=$(grep '"rAgentsRepo":' .ragents | cut -d'"' -f4)
AGENT_PATH=$(grep '"agentPath":' .ragents | cut -d'"' -f4)
MEMORY_PATH=$(grep '"memoryPath":' .ragents | cut -d'"' -f4)

echo "📁 Project: $PROJECT_NAME"
echo "🔗 rAgents: $RAGENTS_REPO"

# Clone or update rAgents repository
RAGENTS_DIR="../rAgents"
if [ ! -d "$RAGENTS_DIR" ]; then
    echo "📥 Cloning rAgents repository..."
    git clone "$RAGENTS_REPO" "$RAGENTS_DIR"
else
    echo "🔄 Updating rAgents repository..."
    cd "$RAGENTS_DIR"
    git pull origin main
    cd - > /dev/null
fi

# Create local directories
mkdir -p "agents/shared"
mkdir -p "docs/shared"
mkdir -p "memory/shared"

# Pull agent protocols
echo "📥 Pulling agent protocols..."
if [ -d "$RAGENTS_DIR/$AGENT_PATH" ]; then
    cp -r "$RAGENTS_DIR/$AGENT_PATH"* "agents/shared/" 2>/dev/null
    echo "  ✅ Agent protocols synced"
fi

# Pull universal protocols
if [ -d "$RAGENTS_DIR/agents/universal" ]; then
    cp -r "$RAGENTS_DIR/agents/universal"* "agents/shared/" 2>/dev/null
    echo "  ✅ Universal protocols synced"
fi

# Pull memory exports from all projects
echo "📥 Pulling shared memory..."
for project_memory in "$RAGENTS_DIR/memory"/*; do
    if [ -d "$project_memory" ]; then
        project=$(basename "$project_memory")
        mkdir -p "memory/shared/$project"
        cp "$project_memory"/*.json "memory/shared/$project/" 2>/dev/null
        echo "  ✅ $project memory synced"
    fi
done

# Pull documentation
echo "📥 Pulling shared documentation..."
if [ -d "$RAGENTS_DIR/docs" ]; then
    cp -r "$RAGENTS_DIR/docs"/* "docs/shared/" 2>/dev/null
    echo "  ✅ Documentation synced"
fi

# Create integration guide
cat > "docs/RAGENTS_INTEGRATION.md" << EOF
# rAgents Integration Guide

## Overview
This project is connected to the rAgents centralized hub for AI agent instructions and memory sharing.

## Available Resources

### Agent Protocols
- \`agents/shared/\` - Project-specific and universal agent protocols
- Instructions and initialization procedures from rAgents hub

### Shared Memory  
- \`memory/shared/\` - Memory exports from all projects in ecosystem
- Cross-project context and development history

### Documentation
- \`docs/shared/\` - Centralized documentation and roadmaps
- Project roadmaps and development protocols

## Usage for AI Agents

### Primary Instructions
1. Read \`.ragents\` configuration in project root
2. Access agent protocols in \`agents/shared/\`
3. Use shared memory for cross-project context
4. Follow universal onboarding procedures

### When MCP Memory Unavailable
- Use \`memory/shared/{project}/latest.json\` for project context
- Read \`docs/shared/roadmaps/{project}_roadmap.md\` for current status
- Access agent protocols in \`agents/shared/\`

### Sync Commands
\`\`\`bash
# Push local changes to rAgents hub
./scripts/sync_to_ragents.sh

# Pull latest from rAgents hub
./scripts/sync_from_ragents.sh
\`\`\`

## Repository
Private rAgents hub: $RAGENTS_REPO
EOF

echo "✅ Pull from rAgents complete!"
echo "📂 Local resources updated:"
echo "   - agents/shared/ (protocols)"
echo "   - memory/shared/ (cross-project memory)"  
echo "   - docs/shared/ (documentation)"
echo "   - docs/RAGENTS_INTEGRATION.md (guide)"
