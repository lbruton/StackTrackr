# StackrTrackr Architecture Documentation

> ✨ **Migrated to Linear**: [STACK-9 - Documentation Index & Quick Reference](https://linear.app/hextrackr/issue/STACK-9)

**Generated:** 2025-10-01
**Version:** 3.04.87
**Purpose:** Complete architectural deep dive after months away from development

---

## 📚 Documentation Index

This `/docs/` folder contains comprehensive architectural documentation for StackrTrackr, generated through a complete codebase analysis of all 31 JavaScript files (~15,000 LOC).

### Core Documents

1. **[EXECUTIVE-SUMMARY.md](./EXECUTIVE-SUMMARY.md)** (16KB) ⭐ **START HERE**
   - High-level overview of entire application
   - Technology stack & deployment
   - Key statistics & metrics
   - File structure breakdown
   - Development roadmap

2. **[UI-WIREFRAME.md](./UI-WIREFRAME.md)** (24KB)
   - Complete ASCII UI layout
   - All 15 modal dialogs mapped
   - Component inventory (100+ elements)
   - Responsive behavior patterns
   - Keyboard shortcuts & accessibility

---

## 🎯 Quick Reference

### For Understanding the Codebase
Start with **EXECUTIVE-SUMMARY.md** sections:
- "Architecture Highlights" (page 2)
- "Key Components" (page 3)
- "Module Relationships & Data Flow" (included in agent response)
- "Critical Development Patterns" (page 9)

### For UI/UX Work
Reference **UI-WIREFRAME.md** sections:
- "Complete ASCII UI Layout" (page 1)
- "Modal Overlays" (page 2-4)
- "Component Inventory" (page 5-7)
- "Responsive Behavior" (page 8)

### For API Integration
See **EXECUTIVE-SUMMARY.md** sections:
- "API Integration" (page 4)
- "Spot Price Providers" table
- "Catalog Integration (Numista)" table

### For Data Structures
See **EXECUTIVE-SUMMARY.md** section:
- "Data Model" (page 3)
- Also see agent's comprehensive response for full localStorage schema

---

## 📊 What Was Analyzed

### Complete File Analysis
- ✅ **31 JavaScript files** (~15,000 LOC)
- ✅ **1 HTML file** (117KB main application)
- ✅ **1 CSS file** (119KB complete styling)
- ✅ **All modals, forms, tables** documented
- ✅ **All API providers** mapped
- ✅ **All data structures** defined

### Symbol Tables Generated
The agent's response includes comprehensive symbol tables for:
- `constants.js` - 40+ symbols
- `state.js` - 20+ symbols
- `api.js` - 50+ symbols
- `utils.js` - 80+ symbols
- `init.js` - 4 symbols
- `events.js` - 15+ symbols
- `encryption.js` - 25+ symbols
- `theme.js` - 4 symbols
- `charts.js` - 5 symbols
- `pagination.js` - 3 symbols
- `sorting.js` - 1 symbol
- `search.js` - 1 symbol
- `fuzzy-search.js` - 6 symbols
- `catalog-api.js` - 15+ classes & functions
- `catalog-providers.js` - 3 symbols
- `catalog-manager.js` - 20+ methods

**Total documented symbols:** ~290+ functions, classes, constants, and variables

---

## 🔑 Key Findings from Deep Dive

### Architecture Strengths
✅ **Pure client-side** - Zero backend dependencies
✅ **Modular design** - Clear separation of concerns
✅ **Security-first** - AES-256-GCM encryption, localStorage whitelist
✅ **API flexibility** - 4 providers with fallback chain
✅ **Data integrity** - Comprehensive validation & sanitization
✅ **Theme system** - 4 themes with system detection
✅ **Feature flags** - 3 toggleable features for safe rollouts
✅ **Catalog integration** - Numista API with local caching

### Areas for Improvement (per ROADMAP.md)
⚠️ **ESLint issues** - 460+ undefined variable errors (config fixes needed)
⚠️ **Security vulnerabilities** - 180+ object injection warnings
⚠️ **Code complexity** - 65% of files exceed complexity thresholds
⚠️ **Duplication** - 25% code duplication
⚠️ **Test coverage** - 0% (no test suite)

### Critical Patterns Identified
🔴 **MANDATORY script loading order** - `file-protocol-fix.js` first, `init.js` last
🔴 **localStorage security whitelist** - All keys must be in `ALLOWED_STORAGE_KEYS`
🔴 **Safe DOM access** - Always use `safeGetElement(id, required)`
🔴 **Data persistence** - Use `saveData()`/`loadData()` for encryption support

---

## 🚀 Using This Documentation

### Before Making Changes
1. Read **EXECUTIVE-SUMMARY.md** fully
2. Review **UI-WIREFRAME.md** if touching UI
3. Check the agent's symbol table for specific functions
4. Verify critical patterns are maintained

### During Development
1. Reference component IDs from **UI-WIREFRAME.md**
2. Check API provider patterns from **EXECUTIVE-SUMMARY.md**
3. Follow data structure schemas exactly
4. Maintain script loading order

### After Changes
1. Update relevant documentation
2. Run Docker rebuild: `sudo docker-compose up -d --build`
3. Test across all 4 themes
4. Verify localStorage integrity

---

## 📁 Additional Resources

### In This Repository
- `/CLAUDE.md` - AI assistant configuration & deployment guide
- `/CHANGELOG.md` - Version history
- `/Dockerfile` - Container configuration
- `/nginx.conf` - Web server settings
- `/docker-compose.yml` - Orchestration config

### External Documentation
- **Numista API:** https://en.numista.com/api/doc/
- **Metals.dev API:** https://www.metals.dev/docs
- **Metals-API.com:** https://metals-api.com/documentation
- **Chart.js:** https://www.chartjs.org/docs/latest/
- **PapaParse:** https://www.papaparse.com/docs

---

## 🎯 Development Workflow

### For New Features
```bash
# 1. Read documentation
cat docs/EXECUTIVE-SUMMARY.md | grep -A 20 "Key Components"

# 2. Make changes to files
# Edit js/*.js or index.html

# 3. Rebuild & deploy
sudo docker-compose up -d --build

# 4. Test
open http://192.168.1.81:8080

# 5. Update docs if architecture changed
vim docs/EXECUTIVE-SUMMARY.md
```

### For Bug Fixes
```bash
# 1. Find the function in symbol table
# (See agent's response or EXECUTIVE-SUMMARY.md)

# 2. Read function dependencies
# Check "Dependencies" column in symbol table

# 3. Fix the bug

# 4. Rebuild
sudo docker-compose up -d --build
```

---

## 📝 Documentation Maintenance

### When to Update
- **EXECUTIVE-SUMMARY.md**: When architecture changes (new modules, APIs, patterns)
- **UI-WIREFRAME.md**: When UI components change (new modals, forms, layouts)
- **This README**: When adding/removing documentation files

### How to Update
```bash
# Edit with your preferred editor
vim docs/EXECUTIVE-SUMMARY.md

# Regenerate if major changes
# Re-run the deep dive analysis with Claude Code
```

---

## 🤖 Agent Analysis Details

The documentation was generated by a specialized AI agent that:
1. Read all 31 JavaScript files in full (~15,000 LOC)
2. Extracted every function, class, constant, and variable
3. Mapped dependencies and call graphs
4. Documented all API endpoints and providers
5. Created complete data structure schemas
6. Generated ASCII UI wireframes
7. Identified critical patterns and conventions

**Analysis Duration:** ~25 minutes
**Token Usage:** ~90,000 tokens
**Files Read:** 31 JS files + HTML + CSS
**Symbols Documented:** ~290+ functions/classes/constants

---

## 📧 Support

This is a personal deployment. For questions about the codebase:
1. Check this documentation first
2. Use `grep` to search for specific functions
3. Ask Claude Code with context from these docs

---

## ✅ Documentation Status

| Document | Status | Last Updated | Size |
|----------|--------|--------------|------|
| README.md | ✅ Complete | 2025-10-01 | This file |
| EXECUTIVE-SUMMARY.md | ✅ Complete | 2025-10-01 | 16KB |
| UI-WIREFRAME.md | ✅ Complete | 2025-10-01 | 24KB |
| Symbol Tables | ✅ In Agent Response | 2025-10-01 | ~50KB |
| API Reference | ✅ In EXECUTIVE-SUMMARY | 2025-10-01 | Included |
| Data Structures | ✅ In Agent Response | 2025-10-01 | Included |
| Module Dependencies | ✅ In Agent Response | 2025-10-01 | Included |

**Total Documentation Size:** ~40KB of markdown + comprehensive agent response

---

**Next Steps:**
1. Read EXECUTIVE-SUMMARY.md cover-to-cover
2. Review UI-WIREFRAME.md for component reference
3. Check agent's response for detailed symbol tables
4. Begin development with confidence!

Happy coding! 🚀
