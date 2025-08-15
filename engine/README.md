# StackTrackr Engine - Living Protocol System

The **StackTrackr Engine** ensures that any improvements to agent protocols automatically propagate to all future project deployments. This creates a living, evolving system that gets better with every enhancement.

## 🏗️ Engine Architecture

```
engine/
├── deployment/                    # Deployment scripts
│   ├── deploy-agent-framework.sh # Full framework deployment
│   └── deploy-minimal-framework.sh # Minimal deployment
├── templates/                     # Synchronized protocol templates
│   ├── agents.ai                 # Master agent protocols
│   ├── QUICK-AGENT-PROTOCOLS.ai  # Fast reference
│   ├── unified-workflow.ai       # Multi-agent coordination
│   ├── evening-work-session-protocol.md
│   ├── mcp_backup_system.py      # Backup utilities
│   ├── backup_mcp_memory.sh      # Shell backup
│   ├── sync_memory.sh            # Memory sync
│   └── COPILOT_INSTRUCTIONS.md   # VS Code setup
├── sync/                         # Synchronization system
│   ├── sync-templates.sh         # Manual sync trigger
│   ├── pre-commit-hook.sh        # Auto-sync on git commit
│   ├── last_sync.json           # Sync tracking
│   └── sync.log                 # Sync history
└── FRAMEWORK-DEPLOYMENT-GUIDE.md # Usage documentation
```

## 🔄 How Living Updates Work

### **Automatic Sync**
When you modify any master protocol file:
1. **Git detects** changes to watched files
2. **Pre-commit hook** automatically runs template sync
3. **Templates update** with latest protocols
4. **Deployment scripts** use fresh templates
5. **New projects** get latest improvements

### **Manual Sync**
Force template sync anytime:
```bash
./engine/sync/sync-templates.sh
```

### **Watched Files**
These master files trigger automatic template sync:
- `agents/agents.ai` - Master protocols
- `agents/QUICK-AGENT-PROTOCOLS.ai` - Quick reference
- `agents/unified-workflow.ai` - Multi-agent coordination
- `docs/evening-work-session-protocol.md` - Work sessions
- `scripts/mcp_backup_system.py` - Backup system
- `scripts/backup_mcp_memory.sh` - Shell backup
- `scripts/sync_memory.sh` - Memory sync
- `COPILOT_INSTRUCTIONS.md` - VS Code setup

## 🚀 Using the Engine

### **Deploy Full Framework**
```bash
./engine/deployment/deploy-agent-framework.sh ~/Projects/NewApp NewApp
```

### **Deploy Minimal Framework**
```bash
./engine/deployment/deploy-minimal-framework.sh ~/Projects/SimpleScript
```

### **Install Auto-Sync (One-time setup)**
```bash
# Link pre-commit hook
ln -sf ../../engine/sync/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 📈 Evolution Benefits

### **Continuous Improvement**
- ✅ Bug fixes in StackTrackr → All future projects benefit
- ✅ New efficiency protocols → Deployed automatically
- ✅ Enhanced MCP integration → Propagates immediately
- ✅ Cost optimization → Applied universally

### **Version Tracking**
- `engine/sync/last_sync.json` - Tracks sync metadata
- `engine/sync/sync.log` - Complete sync history
- Template files include sync timestamps

### **Zero Maintenance**
- Protocols evolve naturally with StackTrackr development
- No manual template updates required
- New projects always get latest best practices

## 🎯 Framework Versions

- **Engine v1.0**: Living template system with auto-sync
- **Protocols v4.1**: Current agent framework version
- **Templates**: Always match current master protocols

## 🔧 Advanced Usage

### **Custom Template Modifications**
```bash
# Modify templates directly (discouraged - changes will be overwritten)
# Better: Modify master files, let sync propagate

# Check sync status
cat engine/sync/last_sync.json

# View sync history
tail engine/sync/sync.log
```

### **Sync Verification**
```bash
# Force sync and verify
./engine/sync/sync-templates.sh

# Check for differences
diff agents/agents.ai engine/templates/agents.ai
```

## 💡 Best Practices

1. **Modify Masters**: Always edit source files, not templates
2. **Test First**: Validate protocol changes in StackTrackr before deploying
3. **Version Protocols**: Use semantic versioning for major protocol changes
4. **Document Changes**: Update changelogs when adding new features

## 🌟 Result

**Every enhancement to StackTrackr protocols automatically improves all future projects.**

This creates a compound effect where each project benefits from the collective learning and optimization of all previous projects. The engine ensures your agent framework becomes increasingly powerful and cost-effective over time.

---

*The StackTrackr Engine transforms static templates into a living, evolving system that grows smarter with every commit.*
