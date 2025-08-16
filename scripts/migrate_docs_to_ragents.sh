#!/bin/bash

# StackTrackr Documentation Migration to rAgents
# Migrates non-critical documentation while keeping essential files local

echo "📚 StackTrackr Documentation Migration"
echo "====================================="

# Load rAgents configuration
if [ ! -f ".ragents" ]; then
    echo "❌ .ragents file not found. Run from StackTrackr root."
    exit 1
fi

RAGENTS_REPO=$(grep '"rAgentsRepo":' .ragents | cut -d'"' -f4)
RAGENTS_DIR="../rAgents"

# Update rAgents repository
if [ ! -d "$RAGENTS_DIR" ]; then
    echo "📥 Cloning rAgents repository..."
    git clone "$RAGENTS_REPO" "$RAGENTS_DIR"
else
    echo "🔄 Updating rAgents repository..."
    cd "$RAGENTS_DIR"
    git pull origin main
    cd - > /dev/null
fi

# Create StackTrackr documentation structure in rAgents
echo "📁 Creating StackTrackr documentation structure..."
mkdir -p "$RAGENTS_DIR/docs/stacktrackr"
mkdir -p "$RAGENTS_DIR/docs/stacktrackr/architecture"
mkdir -p "$RAGENTS_DIR/docs/stacktrackr/development"
mkdir -p "$RAGENTS_DIR/docs/stacktrackr/processes"
mkdir -p "$RAGENTS_DIR/docs/stacktrackr/archive"

# Files to migrate (non-critical documentation)
MIGRATE_FILES=(
    "AGENTS.md:archive/"
    "BUGS.md:development/"
    "CHECKPOINT-TABLE-REDESIGN.md:development/"
    "CURRENT_IMPLEMENTATION_STATUS.md:development/"
    "GPT_TASKS.md:development/"
    "SCREENSHOT_ASSETS.md:development/"
    "TODO-NEXT-SESSION.md:development/"
    "problematic.md:development/"
    "docs/FRAMEWORK-DEPLOYMENT-GUIDE.md:architecture/"
    "docs/MAINTENANCE-CYCLE-PROTOCOL.md:processes/"
    "docs/TASK-ORGANIZATION-PLAN.md:processes/"
    "docs/agent-escalation-protocol.md:processes/"
    "docs/announcements.md:archive/"
    "docs/backlog.md:development/"
    "docs/bug_resolution_template.md:processes/"
    "docs/bugfix.md:development/"
    "docs/evening-work-session-protocol.md:processes/"
    "docs/gemini-price-api-strategy.md:architecture/"
    "docs/git-checkpoint-workflow.md:processes/"
    "docs/human_workflow.md:processes/"
    "docs/markup_style_guide.md:development/"
    "docs/processes.md:processes/"
    "docs/release_process.md:processes/"
    "docs/rengine-memory-architecture.md:architecture/"
    "docs/rengine-setup-prompt.md:archive/"
    "docs/screenshot-procedure.md:processes/"
    "docs/search-algorithm-enhancements.md:architecture/"
    "docs/style_guide.md:development/"
    "docs/ui_style_guide.md:development/"
    "docs/universal-ai-platform-vision.md:architecture/"
)

# Essential files to keep local (create minimal versions)
KEEP_LOCAL=(
    "README.md"
    "LICENSE"  
    "docs/roadmap.md"
    "docs/changelog.md"
    "docs/versioning.md"
)

echo "📤 Migrating documentation files..."
for file_mapping in "${MIGRATE_FILES[@]}"; do
    IFS=':' read -r file_path dest_dir <<< "$file_mapping"
    
    if [ -f "$file_path" ]; then
        filename=$(basename "$file_path")
        dest_path="$RAGENTS_DIR/docs/stacktrackr/$dest_dir$filename"
        cp "$file_path" "$dest_path"
        echo "  ✅ $file_path → docs/stacktrackr/$dest_dir$filename"
        
        # Remove from local (keep backup in git history)
        rm "$file_path"
    else
        echo "  ⚠️  $file_path not found"
    fi
done

# Create documentation index in rAgents
cat > "$RAGENTS_DIR/docs/stacktrackr/README.md" << 'EOF'
# StackTrackr Documentation Hub

## Overview
Centralized documentation for StackTrackr precious metals inventory management application.

## Structure

### Architecture
- `architecture/` - Technical architecture, API strategies, and system design
- `development/` - Development documentation, bugs, tasks, and implementation status  
- `processes/` - Development processes, workflows, and protocols
- `archive/` - Historical documentation and deprecated files

### Key Documents

#### Architecture & Design
- `gemini-price-api-strategy.md` - AI-powered pricing strategy
- `search-algorithm-enhancements.md` - Search functionality improvements
- `universal-ai-platform-vision.md` - Platform evolution roadmap
- `rengine-memory-architecture.md` - Memory system architecture

#### Development
- `CURRENT_IMPLEMENTATION_STATUS.md` - Current development status
- `TODO-NEXT-SESSION.md` - Next session tasks and priorities
- `BUGS.md` - Bug tracking and resolution
- `problematic.md` - Known issues and workarounds

#### Processes
- `MAINTENANCE-CYCLE-PROTOCOL.md` - Regular maintenance procedures
- `git-checkpoint-workflow.md` - Version control workflows
- `release_process.md` - Release management procedures
- `screenshot-procedure.md` - Documentation procedures

## Local Project Files
Essential files remain in the local StackTrackr project:
- `README.md` - Project overview and setup
- `LICENSE` - Project license
- `docs/roadmap.md` - Current roadmap and active tasks
- `docs/changelog.md` - Release history
- `docs/versioning.md` - Version management

## Integration
Documentation is synced via rAgents repository. Use sync scripts to keep documentation current:
```bash
./scripts/sync_to_ragents.sh    # Push documentation updates
./scripts/sync_from_ragents.sh  # Pull latest documentation
```
EOF

# Create minimal local documentation structure
echo "📝 Creating minimal local documentation..."

# Update local README to reference rAgents
cat > "README.md" << 'EOF'
# StackTrackr

Precious metals inventory management application for tracking gold, silver, platinum, and other collectible investments.

## Quick Start
1. Open `index.html` in a web browser
2. Import CSV data or add items manually
3. Track your precious metals portfolio

## Features
- **Inventory Management** - Add, edit, and track precious metals
- **Price Tracking** - Monitor spot prices and market values
- **Portfolio Analytics** - Value calculations and performance metrics
- **Data Import/Export** - CSV import/export functionality
- **Encryption** - Optional AES-256 encryption for data security

## Documentation
Comprehensive documentation is available in the [rAgents repository](https://github.com/lbruton/rAgents):
- Architecture and technical design
- Development processes and workflows  
- Bug tracking and resolution procedures
- Implementation status and roadmaps

## Local Files
- `docs/roadmap.md` - Current development roadmap
- `docs/changelog.md` - Release history
- `docs/versioning.md` - Version management
- `.ragents` - rAgents integration configuration

## Development
See [rAgents documentation hub](https://github.com/lbruton/rAgents/tree/main/docs/stacktrackr) for detailed development documentation.

## License
See LICENSE file for details.
EOF

# Create streamlined local roadmap reference
cat > "docs/roadmap.md" << 'EOF'
# StackTrackr Roadmap

> **Note**: Detailed documentation has been migrated to [rAgents repository](https://github.com/lbruton/rAgents/tree/main/docs/stacktrackr).

## Current Sprint

### Active Development
- Column resizing and responsive design improvements
- Filter chips functionality fixes
- Table styling consistency

### Next Session Tasks
See `docs/stacktrackr/development/TODO-NEXT-SESSION.md` in rAgents repository for detailed task list.

## Quick Reference

### Critical Files (Local)
- Application code: `js/`, `css/`, `index.html`
- Configuration: `.ragents`
- Core documentation: `README.md`, `LICENSE`

### Documentation (rAgents)  
- Architecture: `docs/stacktrackr/architecture/`
- Development: `docs/stacktrackr/development/`
- Processes: `docs/stacktrackr/processes/`
- Archive: `docs/stacktrackr/archive/`

## Sync Commands
```bash
# Push local changes to rAgents
./scripts/sync_to_ragents.sh

# Pull latest documentation  
./scripts/sync_from_ragents.sh
```

For detailed roadmap, bug tracking, and development status, see the rAgents documentation hub.
EOF

echo "✅ Documentation migration complete!"

# Commit changes to rAgents
echo "📤 Committing documentation to rAgents..."
cd "$RAGENTS_DIR"
git add .
git commit -m "Migrate StackTrackr documentation to centralized hub

- Organized documentation into architecture, development, processes, archive
- Created comprehensive documentation index
- Migrated 25+ documentation files from local project
- Streamlined local project to essential files only"

git push origin main

echo ""
echo "🎉 StackTrackr Documentation Migration Complete!"
echo ""
echo "📁 Local project now contains only essential files:"
echo "   - Application code (js/, css/, index.html)"
echo "   - Core configuration (.ragents)"  
echo "   - Minimal documentation (README.md, docs/roadmap.md)"
echo ""
echo "📚 All detailed documentation now in rAgents:"
echo "   - https://github.com/lbruton/rAgents/tree/main/docs/stacktrackr"
echo ""
echo "🔄 Use sync scripts to keep documentation current:"
echo "   - ./scripts/sync_to_ragents.sh (push changes)"
echo "   - ./scripts/sync_from_ragents.sh (pull updates)"

cd - > /dev/null
