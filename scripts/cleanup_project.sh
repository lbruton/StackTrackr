#!/bin/bash

# StackTrackr Project Cleanup Script
# Moves all documentation and non-essential files to rAgents repository
# Keeps only files necessary for the application to run and agent bootstrap

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RAGENTS_DIR="/Volumes/DATA/GitHub/rAgents"

echo "🧹 Starting StackTrackr project cleanup..."
echo "Project: $PROJECT_DIR"
echo "rAgents: $RAGENTS_DIR"

# Ensure rAgents repository is up to date
if [ ! -d "$RAGENTS_DIR" ]; then
    echo "❌ rAgents repository not found at $RAGENTS_DIR"
    exit 1
fi

cd "$RAGENTS_DIR"
git pull origin main

# Create backup directory for moved files
backup_dir="$RAGENTS_DIR/docs/stacktrackr/cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"

cd "$PROJECT_DIR"

echo "📁 Moving documentation files to rAgents..."

# Files to move to rAgents (documentation, demos, samples)
files_to_move=(
    "agents.ai"
    "codex.ai"
    "COPILOT_INSTRUCTIONS.md"
    "ai-search-demo.html"
    "rsynk-settings.html"
    "sample-inventory.csv"
    "sample.csv"
    "test-upload.csv"
    "local_memory.json"
    "memory_export.json"
)

# Move files to rAgents
for file in "${files_to_move[@]}"; do
    if [ -f "$file" ]; then
        echo "  📄 Moving $file"
        cp "$file" "$backup_dir/"
        rm "$file"
    fi
done

# Move entire documentation directories
dirs_to_move=(
    "docs"
    "templates"
    "fixes"
    "backups"
    "memory"
)

for dir in "${dirs_to_move[@]}"; do
    if [ -d "$dir" ]; then
        echo "  📁 Moving directory $dir"
        cp -r "$dir" "$backup_dir/"
        rm -rf "$dir"
    fi
done

# Keep essential files for application
echo "✅ Essential files kept in project:"
echo "  - index.html (main application)"
echo "  - README.md (project overview)"
echo "  - LICENSE (legal)"
echo "  - .ragents (agent configuration)"
echo "  - css/ (application styles)"
echo "  - js/ (application logic)"
echo "  - images/ (UI assets)"
echo "  - engine/ (data processing)"
echo "  - agents/ (agent bootstrap files only)"
echo "  - scripts/ (build and deployment)"
echo "  - tests/ (application tests)"
echo "  - downloads/ (user data export)"

# Clean up agent directory - keep only bootstrap files
echo "🤖 Cleaning agents directory..."
if [ -d "agents" ]; then
    # Move all agent files to rAgents first
    cp -r agents "$backup_dir/"
    
    # Keep only essential bootstrap files
    mkdir -p "agents/bootstrap"
    
    # Create minimal agents.ai for bootstrapping
    cat > "agents/agents.ai" << 'EOF'
# StackTrackr Agent Bootstrap
# Minimal agent configuration for project initialization

## Project Context
StackTrackr is a client-side precious metals investment tracker.

## Agent Resources
- Full documentation: rAgents repository
- Memory sync: ./scripts/sync_to_ragents.sh
- Configuration: .ragents file

## Quick Start
1. Run sync script to access full documentation
2. Follow protocols in rAgents/agents/stacktrackr/
3. Use memory prioritization for focused context

## Essential Commands
- Start development: Open index.html
- Sync memory: ./scripts/sync_to_ragents.sh
- Update from central: ./scripts/sync_from_ragents.sh
EOF

    # Remove other agent files
    find agents -type f ! -name "agents.ai" -delete
    find agents -type d -empty -delete
fi

# Update README.md to reference rAgents
echo "📝 Updating README.md..."
if [ -f "README.md" ]; then
    # Backup original README
    cp "README.md" "$backup_dir/README-original.md"
    
    # Create streamlined README
    cat > "README.md" << 'EOF'
# StackTrackr

A comprehensive client-side web application for tracking precious metal investments including silver, gold, platinum, and palladium.

## Quick Start

1. Open `index.html` in a web browser
2. No server required - runs entirely client-side
3. Data stored locally using browser localStorage

## Features

- Real-time spot price tracking
- Premium calculations
- Investment portfolio management
- Multi-format data import/export
- Offline functionality

## Development

For full documentation, agent protocols, and development resources, see the [rAgents repository](https://github.com/lbruton/rAgents).

### Agent Integration

This project uses centralized agent management through rAgents:

```bash
# Sync project memory to central hub
./scripts/sync_to_ragents.sh

# Pull latest protocols and documentation
./scripts/sync_from_ragents.sh
```

## License

See LICENSE file for details.
EOF
fi

# Commit changes to rAgents
echo "💾 Committing moved files to rAgents..."
cd "$RAGENTS_DIR"
git add .
git commit -m "StackTrackr cleanup: Move documentation and non-essential files

- Moved agent protocols, documentation, and sample files
- Cleaned up project for production deployment
- Maintained agent bootstrap capability
- Files moved to: docs/stacktrackr/cleanup-$(date +%Y%m%d-%H%M%S)"

# Push to rAgents
git push origin main

echo "✅ StackTrackr cleanup completed!"
echo ""
echo "📊 Summary:"
echo "  - Documentation moved to rAgents repository"
echo "  - Project folder cleaned for production"
echo "  - Agent bootstrap files maintained"
echo "  - README.md updated with rAgents references"
echo ""
echo "🔗 Access full documentation at:"
echo "  https://github.com/lbruton/rAgents"
echo ""
echo "🚀 Project is now ready for deployment!"
