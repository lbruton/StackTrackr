#!/bin/bash

# StackTrackr Agent Framework - MINIMAL Deployment
# For simple projects that need just the core agent protocols

set -e

TARGET_PROJECT="${1:-}"
PROJECT_NAME="${2:-SimpleProject}"

if [ -z "$TARGET_PROJECT" ]; then
    echo "Usage: $0 <target_project_path> [project_name]"
    echo "Example: $0 /path/to/SimpleScript SimpleScript"
    exit 1
fi

echo "⚡ Deploying MINIMAL Agent Framework to: $TARGET_PROJECT"

# Core essentials only
mkdir -p "$TARGET_PROJECT"/{agents,docs}

# Copy only essential files
cp agents/QUICK-AGENT-PROTOCOLS.ai "$TARGET_PROJECT/agents/"
cp COPILOT_INSTRUCTIONS.md "$TARGET_PROJECT/"

# Create lightweight agents.ai
cat > "$TARGET_PROJECT/agents/agents.ai" << 'EOF'
# Minimal Agent Protocols for Quick Projects

## Essential Rules
1. **Before any change**: Check git status, commit if needed
2. **Every 20 minutes**: Create git checkpoint with descriptive message
3. **Document fixes**: Note what you changed and why
4. **Use MCP memory**: Search for existing solutions before implementing

## Quick Checklist
- [ ] Git status clean before starting
- [ ] Search MCP memory for relevant context
- [ ] Make focused changes with clear commit messages
- [ ] Document any new discoveries or fixes
- [ ] Create checkpoint before major changes

## Trigger Words
- "status" - Report current progress
- "checkpoint" - Create git commit
- "complete" - Finish and document

Keep it simple, keep it documented, keep it committed.
EOF

# Basic README
cat > "$TARGET_PROJECT/README.md" << EOF
# $PROJECT_NAME

Agent-enhanced development with minimal StackTrackr protocols.

## Quick Agent Setup
1. Read \`agents/agents.ai\` 
2. Check \`agents/QUICK-AGENT-PROTOCOLS.ai\`
3. Start with: "I need to..."

Minimal framework for focused development.
EOF

echo "✅ Minimal framework deployed!"
echo "📍 Essential files:"
echo "   - agents/agents.ai (core protocols)"
echo "   - agents/QUICK-AGENT-PROTOCOLS.ai (checklist)"
echo "   - COPILOT_INSTRUCTIONS.md (VS Code setup)"
echo ""
echo "🎯 Perfect for: Scripts, small utilities, proof-of-concepts"
