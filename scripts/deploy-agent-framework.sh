#!/bin/bash

# StackTrackr Agent Framework Deployment Script
# Rapidly deploy the agent framework to any new project

set -e

# Configuration
SOURCE_PROJECT="/Volumes/DATA/GitHub/StackTrackr"
TARGET_PROJECT="${1:-}"
PROJECT_NAME="${2:-NewProject}"

if [ -z "$TARGET_PROJECT" ]; then
    echo "Usage: $0 <target_project_path> [project_name]"
    echo "Example: $0 /path/to/MyNewProject MyNewProject"
    exit 1
fi

echo "🚀 Deploying StackTrackr Agent Framework to: $TARGET_PROJECT"
echo "📝 Project Name: $PROJECT_NAME"

# Create target directory if it doesn't exist
mkdir -p "$TARGET_PROJECT"

# Core Framework Files to Copy
FRAMEWORK_FILES=(
    "agents/agents.ai"
    "agents/QUICK-AGENT-PROTOCOLS.ai"
    "agents/unified-workflow.ai"
    "docs/evening-work-session-protocol.md"
    "scripts/mcp_backup_system.py"
    "scripts/backup_mcp_memory.sh"
    "scripts/sync_memory.sh"
    "COPILOT_INSTRUCTIONS.md"
    "templates/project-initialization.md"
)

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p "$TARGET_PROJECT"/{agents,docs/fixes,docs/patch,scripts,backups/mcp_memory,tests,css,js,images}

# Copy framework files
echo "📋 Copying framework files..."
for file in "${FRAMEWORK_FILES[@]}"; do
    if [ -f "$SOURCE_PROJECT/$file" ]; then
        cp "$SOURCE_PROJECT/$file" "$TARGET_PROJECT/$file"
        echo "  ✅ Copied: $file"
    else
        echo "  ⚠️  Missing: $file"
    fi
done

# Create agent status files
echo "🤖 Creating agent status files..."
for agent in claude gpt gemini; do
    cat > "$TARGET_PROJECT/agents/${agent}.ai" << EOF
# ${agent^} Agent Status for $PROJECT_NAME
## Last Updated: $(date)

### Current Status: INITIALIZED
### Last Task: Framework deployment
### Next Action: Awaiting first assignment

### Session Context:
- Project: $PROJECT_NAME
- Framework: StackTrackr Agent System v4.1
- Memory: Not yet initialized

### Dependencies: None
### Blocking Issues: None

### Notes:
Agent framework successfully deployed. Ready for first work session.
EOF
    echo "  ✅ Created: agents/${agent}.ai"
done

# Customize agents.ai for new project
echo "🔧 Customizing agents.ai for $PROJECT_NAME..."
if [ -f "$TARGET_PROJECT/agents/agents.ai" ]; then
    sed -i.bak "s/StackTrackr/$PROJECT_NAME/g" "$TARGET_PROJECT/agents/agents.ai"
    rm "$TARGET_PROJECT/agents/agents.ai.bak"
    echo "  ✅ Updated project references"
fi

# Create basic project files
echo "📝 Creating basic project files..."

# Basic README
cat > "$TARGET_PROJECT/README.md" << EOF
# $PROJECT_NAME

## Agent-Enhanced Development

This project uses the StackTrackr Agent Framework for efficient AI-assisted development.

### Quick Start for Agents

1. Read \`agents/agents.ai\` for complete protocols
2. Check \`agents/QUICK-AGENT-PROTOCOLS.ai\` for checklists
3. Use evening session protocol: "I have X hours, what can we work on?"

### Framework Features

- 🤖 Multi-agent coordination
- 📚 MCP memory integration
- ⚡ Git checkpoint protocols
- 🔄 Backup & recovery systems
- 📊 Cost-optimized workflows

### Getting Started

\`\`\`bash
# Initialize MCP memory (first time setup)
# Follow evening-work-session-protocol.md
\`\`\`

Created with StackTrackr Agent Framework v4.1
EOF

# Basic roadmap
cat > "$TARGET_PROJECT/docs/roadmap.md" << EOF
# $PROJECT_NAME Development Roadmap

## Phase 1: Foundation
- [ ] Project structure setup
- [ ] Core functionality implementation
- [ ] Basic testing framework

## Phase 2: Features
- [ ] Feature development
- [ ] UI/UX implementation
- [ ] Performance optimization

## Phase 3: Polish
- [ ] Bug fixes and refinement
- [ ] Documentation completion
- [ ] Deployment preparation

## Agent Memory Categories
- project-setup
- feature-development
- bug-tracking
- performance-optimization

*This roadmap will be automatically loaded into MCP memory for agent access.*
EOF

# Basic changelog
cat > "$TARGET_PROJECT/docs/changelog.md" << EOF
# $PROJECT_NAME Changelog

## [0.1.0] - $(date +%Y-%m-%d)
### Added
- StackTrackr Agent Framework deployment
- Initial project structure
- Agent coordination protocols
- MCP memory integration
- Git checkpoint system

### Framework Features
- Multi-agent status tracking
- Evening work session protocols
- Backup and recovery systems
- Cost-optimized token usage
EOF

# Make scripts executable
chmod +x "$TARGET_PROJECT/scripts/"*.sh
chmod +x "$TARGET_PROJECT/scripts/"*.py

# Initialize git if not already a repo
if [ ! -d "$TARGET_PROJECT/.git" ]; then
    echo "🔧 Initializing git repository..."
    cd "$TARGET_PROJECT"
    git init
    git add .
    git commit -m "feat: deploy StackTrackr Agent Framework v4.1

- Added complete agent coordination system
- Implemented MCP memory integration
- Set up git checkpoint protocols
- Created backup and recovery system
- Configured cost-optimized workflows"
    cd - > /dev/null
fi

echo ""
echo "🎉 StackTrackr Agent Framework successfully deployed!"
echo ""
echo "📍 Location: $TARGET_PROJECT"
echo "📖 Next Steps:"
echo "   1. cd '$TARGET_PROJECT'"
echo "   2. Initialize MCP memory with project roadmap"
echo "   3. Start first evening session: 'I have X hours, what can we work on?'"
echo ""
echo "🤖 Agent Status Files Created:"
echo "   - agents/claude.ai"
echo "   - agents/gpt.ai" 
echo "   - agents/gemini.ai"
echo ""
echo "📚 Key Files:"
echo "   - agents/agents.ai (master protocols)"
echo "   - agents/QUICK-AGENT-PROTOCOLS.ai (checklists)"
echo "   - docs/evening-work-session-protocol.md (workflow)"
echo "   - COPILOT_INSTRUCTIONS.md (VS Code setup)"
echo ""
echo "💡 Framework Features Ready:"
echo "   ✅ Multi-agent coordination"
echo "   ✅ MCP memory integration"
echo "   ✅ Git checkpoint protocols"
echo "   ✅ Backup & recovery"
echo "   ✅ Cost optimization"
echo ""
echo "Ready for agent-enhanced development! 🚀"
