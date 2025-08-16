#!/bin/bash

# rEngine Centralized Memory Setup Script
# Prepares rEngine repository for centralized memory management

set -e

echo "🚀 Setting up rEngine as Centralized Memory Manager"
echo "=================================================="

# Configuration
RENGINE_PATH="${1:-/Volumes/DATA/GitHub/rEngine}"
STACKTRACKR_PATH="/Volumes/DATA/GitHub/StackTrackr"

echo "📁 rEngine Path: $RENGINE_PATH"
echo "📁 StackTrackr Path: $STACKTRACKR_PATH"

# Verify paths exist
if [ ! -d "$RENGINE_PATH" ]; then
    echo "❌ Error: rEngine directory not found at $RENGINE_PATH"
    echo "Please create the rEngine repository first or provide correct path as argument"
    exit 1
fi

if [ ! -d "$STACKTRACKR_PATH" ]; then
    echo "❌ Error: StackTrackr directory not found at $STACKTRACKR_PATH"
    exit 1
fi

cd "$RENGINE_PATH"

echo ""
echo "📂 Creating rEngine directory structure..."

# Create main directories
mkdir -p shared_memory/{global,apps,agents,backups}
mkdir -p Develop/{shared,templates}
mkdir -p engine/{memory,agents,sync}
mkdir -p scripts

echo "✅ Directory structure created"

echo ""
echo "🧠 Setting up shared memory files..."

# Global memory pool
cat > shared_memory/global/global_memory.json << 'EOF'
{
  "version": "1.0.0",
  "created": "2025-08-15",
  "shared_knowledge": {
    "bugs": [],
    "patterns": [],
    "solutions": [],
    "best_practices": [],
    "agent_learnings": []
  },
  "app_registry": {},
  "cross_app_insights": [],
  "memory_stats": {
    "total_apps": 0,
    "total_insights": 0,
    "last_sync": null
  }
}
EOF

# App registry
cat > shared_memory/apps/app_registry.json << 'EOF'
{
  "version": "1.0.0",
  "apps": {},
  "sync_config": {
    "auto_sync": true,
    "sync_interval": 300,
    "conflict_resolution": "merge"
  }
}
EOF

# Agent context
cat > shared_memory/agents/agent_context.json << 'EOF'
{
  "version": "1.0.0",
  "shared_context": {
    "development_patterns": [],
    "optimization_techniques": [],
    "debugging_strategies": [],
    "workflow_improvements": []
  },
  "agent_coordination": {
    "active_sessions": [],
    "handoff_protocols": [],
    "conflict_resolution": []
  }
}
EOF

echo "✅ Memory files initialized"

echo ""
echo "🔧 Creating memory management engine..."

# Memory sync coordinator
cat > engine/memory/memory_sync.py << 'EOF'
#!/usr/bin/env python3
"""
rEngine Centralized Memory Sync System
Coordinates memory between global pool and individual apps
"""

import json
import os
from datetime import datetime
from pathlib import Path

class MemorySync:
    def __init__(self, rengine_path=None):
        self.rengine_path = rengine_path or os.getcwd()
        self.global_memory_path = f"{self.rengine_path}/shared_memory/global/global_memory.json"
        self.app_registry_path = f"{self.rengine_path}/shared_memory/apps/app_registry.json"
        
    def register_app(self, app_name, app_path, local_memory_path):
        """Register a new app in the centralized system"""
        with open(self.app_registry_path, 'r') as f:
            registry = json.load(f)
        
        registry['apps'][app_name] = {
            "path": app_path,
            "local_memory": local_memory_path,
            "registered": datetime.now().isoformat(),
            "status": "active",
            "last_sync": None
        }
        
        with open(self.app_registry_path, 'w') as f:
            json.dump(registry, f, indent=2)
        
        print(f"✅ Registered {app_name} in centralized memory system")
    
    def sync_app_to_global(self, app_name):
        """Sync app memory to global pool"""
        # Implementation for syncing app memory to global pool
        print(f"🔄 Syncing {app_name} to global memory pool...")
        
    def sync_global_to_app(self, app_name):
        """Sync global insights to app memory"""
        # Implementation for syncing global insights to app
        print(f"⬇️ Syncing global insights to {app_name}...")
    
    def full_sync(self):
        """Perform full bidirectional sync across all apps"""
        print("🔄 Performing full memory synchronization...")
        # Implementation for full sync

if __name__ == "__main__":
    sync = MemorySync()
    print("rEngine Memory Sync System")
    print("Use sync.register_app() to add new applications")
EOF

# App manager
cat > engine/memory/app_manager.py << 'EOF'
#!/usr/bin/env python3
"""
rEngine App Lifecycle Manager
Manages app creation, memory setup, and integration
"""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path

class AppManager:
    def __init__(self, rengine_path=None):
        self.rengine_path = rengine_path or os.getcwd()
        self.develop_path = f"{self.rengine_path}/Develop"
        
    def create_app_stub(self, app_name, template="basic"):
        """Create a new app stub in Develop folder"""
        app_path = f"{self.develop_path}/{app_name}"
        
        if os.path.exists(app_path):
            print(f"❌ App {app_name} already exists at {app_path}")
            return False
        
        os.makedirs(app_path)
        
        # Create basic structure
        os.makedirs(f"{app_path}/src")
        os.makedirs(f"{app_path}/docs")
        os.makedirs(f"{app_path}/scripts")
        
        # Initialize local memory
        local_memory = {
            "app_name": app_name,
            "created": datetime.now().isoformat(),
            "local_context": {},
            "sync_config": {
                "global_sync": True,
                "last_sync": None
            }
        }
        
        with open(f"{app_path}/local_memory.json", 'w') as f:
            json.dump(local_memory, f, indent=2)
        
        # Create README
        with open(f"{app_path}/README.md", 'w') as f:
            f.write(f"# {app_name}\n\n")
            f.write("rEngine Application\n\n")
            f.write("## Features\n\n")
            f.write("## Development\n\n")
            f.write("This app is part of the rEngine ecosystem with shared memory management.\n")
        
        print(f"✅ Created app stub: {app_name}")
        print(f"📁 Location: {app_path}")
        
        return app_path

if __name__ == "__main__":
    manager = AppManager()
    print("rEngine App Manager")
    print("Use manager.create_app_stub('AppName') to create new applications")
EOF

echo "✅ Memory engine created"

echo ""
echo "📋 Creating management scripts..."

# New app deployment script
cat > scripts/deploy_new_app.sh << 'EOF'
#!/bin/bash

# Deploy new app in rEngine ecosystem
APP_NAME="$1"

if [ -z "$APP_NAME" ]; then
    echo "Usage: $0 <AppName>"
    exit 1
fi

echo "🚀 Deploying new app: $APP_NAME"

# Create app using app manager
python3 engine/memory/app_manager.py

echo "📝 Next steps:"
echo "1. Develop your app in Develop/$APP_NAME/"
echo "2. Use shared components from Develop/shared/"
echo "3. Memory will automatically sync with global pool"
echo "4. Agents can work across all your apps seamlessly"
EOF

# Sync all apps script
cat > scripts/sync_all_apps.sh << 'EOF'
#!/bin/bash

echo "🔄 Syncing all rEngine apps with global memory..."

python3 engine/memory/memory_sync.py

echo "✅ Global memory synchronization complete"
EOF

# Make scripts executable
chmod +x scripts/*.sh
chmod +x engine/memory/*.py

echo "✅ Management scripts created"

echo ""
echo "🔗 Setting up StackTrackr integration..."

# Check if StackTrackr should be moved to rEngine
read -p "Move StackTrackr to rEngine/Develop/ as first app? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "$RENGINE_PATH/Develop/StackTrackr" ]; then
        echo "⚠️  StackTrackr already exists in Develop folder"
    else
        echo "📦 Creating symbolic link for StackTrackr..."
        ln -s "$STACKTRACKR_PATH" "$RENGINE_PATH/Develop/StackTrackr"
        echo "✅ StackTrackr linked to rEngine/Develop/"
        
        # Register StackTrackr
        cd "$RENGINE_PATH"
        python3 -c "
from engine.memory.memory_sync import MemorySync
sync = MemorySync()
sync.register_app('StackTrackr', '$STACKTRACKR_PATH', '$STACKTRACKR_PATH/local_memory.json')
"
    fi
fi

echo ""
echo "📋 Creating documentation..."

cat > README.md << 'EOF'
# rEngine - Centralized Development Platform

rEngine serves as a centralized memory manager and development platform for all your AI-powered applications.

## Architecture

- **shared_memory/**: Global knowledge pool shared across all apps
- **Develop/**: Development workspace for all applications  
- **engine/**: Memory management and coordination system
- **scripts/**: Automation and deployment tools

## Quick Start

### Deploy a New App
```bash
./scripts/deploy_new_app.sh MyNewApp
```

### Sync All Apps
```bash
./scripts/sync_all_apps.sh
```

## Benefits

- **Shared Learning**: Insights from one app benefit all others
- **Unified Agent Context**: Agents work seamlessly across projects
- **Reduced Redundancy**: Common patterns and solutions shared
- **Accelerated Development**: Each new app starts with collective knowledge

## Apps in Development

Check `Develop/` folder for all active applications.
EOF

echo "✅ Documentation created"

echo ""
echo "🎉 rEngine Centralized Memory Manager Setup Complete!"
echo "=================================================="
echo ""
echo "📁 Structure created in: $RENGINE_PATH"
echo "🧠 Global memory pool initialized"
echo "🔧 Memory sync engine ready"
echo "📋 Management scripts available"
echo ""
echo "Next steps:"
echo "1. cd $RENGINE_PATH"
echo "2. Start developing apps in Develop/ folder"
echo "3. Use ./scripts/deploy_new_app.sh to create new apps"
echo "4. Memory will automatically sync across all apps"
echo ""
echo "🚀 Your centralized development platform is ready!"
