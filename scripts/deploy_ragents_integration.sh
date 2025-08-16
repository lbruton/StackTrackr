#!/bin/bash

# Deploy rAgents Integration to All Projects
# Copies sync scripts and sets up rAgents integration across ecosystem

echo "🚀 rAgents Integration Deployment"
echo "================================="

# Projects to integrate
PROJECTS=(
    "/Volumes/DATA/GitHub/rEngine"
    "/Volumes/DATA/GitHub/VulnTrackr"
)

SOURCE_DIR="/Volumes/DATA/GitHub/StackTrackr/scripts"
SCRIPTS=(
    "sync_to_ragents.sh"
    "sync_from_ragents.sh"
)

echo "📁 Source: $SOURCE_DIR"
echo "📜 Scripts: ${SCRIPTS[*]}"

for project in "${PROJECTS[@]}"; do
    if [ -d "$project" ]; then
        echo ""
        echo "📁 Project: $(basename "$project")"
        
        # Create scripts directory if it doesn't exist
        mkdir -p "$project/scripts"
        
        # Copy each script
        for script in "${SCRIPTS[@]}"; do
            if [ -f "$SOURCE_DIR/$script" ]; then
                cp "$SOURCE_DIR/$script" "$project/scripts/$script"
                chmod +x "$project/scripts/$script"
                echo "  ✅ $script"
            else
                echo "  ⚠️  $script not found"
            fi
        done
        
        # Create project documentation
        cat > "$project/docs/RAGENTS_SETUP.md" << EOF
# rAgents Integration Setup for $(basename "$project")

## Quick Start
\`\`\`bash
# Push current project data to rAgents hub
./scripts/sync_to_ragents.sh

# Pull shared data from rAgents hub  
./scripts/sync_from_ragents.sh
\`\`\`

## What This Enables
- Centralized AI agent instructions and protocols
- Cross-project memory and context sharing
- Unified documentation and roadmap access
- Consistent agent behavior across all projects

## Configuration
Project configuration is stored in \`.ragents\` file in project root.

## rAgents Hub
Private repository: https://github.com/lbruton/rAgents

## Integration Benefits
- Single source of truth for agent protocols
- Shared memory across all projects  
- Centralized documentation management
- Simplified agent onboarding
- Cross-project development context
EOF
        
        echo "  ✅ Documentation created"
        
    else
        echo "⚠️  Project not found: $project"
    fi
done

echo ""
echo "✅ rAgents Integration Deployment Complete!"
echo ""
echo "🎯 Next Steps:"
echo "  1. Run initial sync from each project: ./scripts/sync_to_ragents.sh"
echo "  2. Agents can now use .ragents file for centralized instructions"
echo "  3. All agent protocols and memory centralized in rAgents hub"
echo "  4. Work normally in individual project folders"
echo ""
echo "🔗 rAgents Hub: https://github.com/lbruton/rAgents"
