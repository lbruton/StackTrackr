# GitHub Copilot Agent Instructions

**MANDATORY**: All agents must follow enhanced protocols for git usage, documentation, and MCP tools.

## 📋 **Quick Start** 
→ See `/agents/QUICK-AGENT-PROTOCOLS.ai` for essential checklist

## 📚 **Complete Instructions**
→ See `/agents/agents.ai` for comprehensive protocols

## 🔄 **Workflow Coordination** 
→ See `/agents/unified-workflow.ai` for multi-agent coordination

---

## 🚨 **Critical Requirements**

### **Before ANY work:**
1. **Git checkpoint**: `git add -A && git commit -m "Checkpoint before [task]"`
2. **Memory check**: `mcp_memory_search_nodes` for existing solutions
3. **Documentation review**: Check roadmap and related docs

### **During work:**
- **Incremental commits** every 15-20 minutes
- **Document discoveries** in MCP memory
- **Test continuously** with Playwright tools

### **After completion:**
- **Final commit** with complete description
- **Update documentation** (patches, fixes, changelogs)
- **Capture knowledge** in MCP memory for future agents

---

**These protocols ensure consistent quality, prevent repeated mistakes, and build institutional knowledge through MCP memory.**