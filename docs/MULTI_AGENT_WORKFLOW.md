# Multi-Agent Development Workflow - StackTrackr v3.03.03a

## 🎯 Project Overview

You are contributing to the **StackTrackr v3.03.03a**, a comprehensive client-side web application for tracking precious metal investments (Silver, Gold, Platinum, Palladium). The project uses a modular JavaScript architecture with local storage, responsive CSS theming, and advanced features like API integration, data visualization, and comprehensive import/export capabilities.

**Current Status**: v3.03.03a (alpha)
**Your Role**: Complete individual 2-hour subtasks as part of a coordinated multi-agent development effort

---

## 🏗️ Multi-Agent Workflow

### **How This Works**
- **70 total subtasks** across 4 development phases
- Each subtask designed for **~2 hour completion**
- **Multiple agents work in parallel** on different subtasks
- **Coordination system** prevents conflicts and ensures quality
- **Task IDs** (1A, 2B, 3C, etc.) track progress and assignments

### **Your Responsibilities**
1. **Pick up an available subtask** from the roadmap
2. **Check dependencies** before starting work
3. **Complete the subtask** following quality standards
4. **Test your changes** thoroughly
5. **Document your work** and any findings
6. **Mark the subtask as complete**

---

## 📋 How to Get Started

### **Step 1: Read the Documentation**
Before starting ANY subtask, read these files:
- `docs/ROADMAP.md` - Complete development roadmap with all subtasks
- `docs/archive/notes/V3.2.0-PLANNING-NOTES.md` - Technical implementation details
- `docs/STATUS.md` - Current project status
- `docs/STRUCTURE.md` - Project architecture and file organization
- `docs/FUNCTIONSTABLE.md` - Reference table of all JavaScript functions

### **Step 2: Choose Your Subtask**
1. **Review available subtasks** in `docs/ROADMAP.md`
2. **Check dependencies** - some subtasks require others to complete first
3. **Verify file conflicts** - avoid working on high-conflict files simultaneously
4. **Announce your choice** if coordinating with other agents

### **Step 3: Understand the Context**
- **Read the current codebase** in the relevant files
- **Understand existing patterns** and architecture
- **Review related subtasks** to understand the bigger picture
- **Check for any existing work** that might affect your subtask

---

## 🎯 Subtask Execution Guidelines

### **Quality Standards (Required for Every Subtask)**

#### ✅ **Functional Testing**
- Verify your changes work as intended
- Test with both empty and populated data
- Check all user interaction scenarios
- Verify mobile and desktop responsiveness

#### ✅ **Integration Testing**  
- Ensure no breaking changes to existing features
- Test spot price calculations, inventory management, search, etc.
- Verify import/export functionality still works
- Check theme switching and modal behavior

#### ✅ **Code Quality**
- Follow existing code patterns and conventions
- Use consistent naming and formatting
- Add JSDoc comments for new functions
- Keep functions focused and modular

#### ✅ **Browser Compatibility**
- Test in Chrome, Firefox, Safari, Edge
- Verify file:// protocol compatibility (open index.html directly)
- Check mobile browsers if making UI changes
- Test with localStorage enabled/disabled

#### ✅ **Documentation Updates**
- Update relevant code comments
- Add any new configuration to constants.js
- Update planning notes if you discover issues
- Document any architectural decisions
- For every release, update:
  - `docs/FUNCTIONSTABLE.md`
  - `docs/CHANGELOG.md`
  - `docs/IMPLEMENTATION_SUMMARY.md`
  - `docs/ROADMAP.md`
  - `docs/STATUS.md`
  - `docs/STRUCTURE.md`

### **File Modification Guidelines**

#### **HIGH CONFLICT RISK FILES** ⚠️ (Coordinate Carefully)
- `index.html` - Multiple subtasks modify this
- `events.js` - Multiple subtasks add event handlers
- `css/styles.css` - Multiple subtasks add styling

**When working on these files:**
- Check with other agents working nearby subtasks
- Make focused, minimal changes
- Test thoroughly for conflicts
- Document exactly what you changed

#### **MEDIUM CONFLICT RISK FILES** ⚠️
- `api.js` - Modified in Phases 1 and 4
- `inventory.js` - Modified in Phases 3 and 4

#### **LOW CONFLICT RISK FILES** ✅ (Safe for Parallel Work)
- Documentation files (.md)
- Individual modal HTML/CSS sections
- Utility functions
- New feature modules

---

## 📖 Phase-Specific Guidelines

### **PHASE 1: Documentation & API Tracking** (Subtasks 1A-2F)
- **Focus**: Documentation updates and API usage tracking
- **Low Risk**: Mostly safe for parallel work after initial audits
- **Key Files**: Documentation files, `api.js`, `constants.js`
- **Testing**: Verify documentation accuracy, test API tracking functionality

### **PHASE 2: UI Improvements** (Subtasks 3A-5I)  
- **Focus**: CSV import feedback, Add Item modal, DATA button reorganization
- **High Risk**: Heavy `index.html` and `events.js` modifications
- **Key Files**: `index.html`, `events.js`, `css/styles.css`, `inventory.js`
- **Testing**: Comprehensive UI testing, modal behavior, responsive design

### **PHASE 3: Data Management** (Subtasks 6A-7I)
- **Focus**: Spot price display fixes and restore functionality  
- **Medium Risk**: Core functionality changes
- **Key Files**: `inventory.js`, new restore components
- **Testing**: Data integrity, backup/restore workflows, spot price accuracy

### **PHASE 4: Advanced Features** (Subtasks 8A-9J)
- **Focus**: Multi-currency support and encrypted backups
- **High Complexity**: Research-heavy, security considerations
- **Key Files**: `api.js`, `inventory.js`, `constants.js`
- **Testing**: Currency conversion accuracy, encryption/decryption workflows

---

## 🚨 Critical Dependencies to Check

### **Before Starting Any Subtask:**

#### **Phase 1 Dependencies:**
- **1A** must complete before 1B-1F (audit before changes)
- **2A** must complete before 2B-2F (design before implementation)

#### **Phase 2 Dependencies:**
- **4A-4B** before 4C-4G (design before implementation)
- **5A-5B** before 5C-5I (design before implementation)  
- **4G** depends on 5I (ADD button placement after cleanup)

#### **Phase 3 Dependencies:**
- **6A-6B** before 6C-6F (analysis before fixes)
- **7A** before 7B-7I (design before implementation)

#### **Phase 4 Dependencies:**
- **8A-8B** before 8C-8K (research before implementation)
- **9A-9B** before 9C-9J (research before implementation)
- **9D** depends on 7B (backup encryption needs restore parsing)

---

## 📝 Subtask Completion Checklist

### **Before You Start:**
- [ ] Read all relevant documentation
- [ ] Understand the subtask requirements
- [ ] Check dependencies are met
- [ ] Verify no file conflicts with other agents
- [ ] Review related code sections

### **During Development:**
- [ ] Follow existing code patterns
- [ ] Make focused, minimal changes
- [ ] Test incrementally as you work
- [ ] Document any issues or discoveries
- [ ] Keep changes organized and clean

### **Before Submitting:**
- [ ] **Functional testing** - Does it work as intended?
- [ ] **Integration testing** - Did you break anything?
- [ ] **Code quality** - Clean, documented, consistent?
- [ ] **Browser testing** - Works across major browsers?
- [ ] **Documentation** - Updated relevant docs/comments?
- [ ] **File cleanup** - Removed debug code, organized changes?

### **After Completion:**
- [ ] Mark subtask as complete in coordination system
- [ ] Document any findings that affect other subtasks  
- [ ] Note any changes to original requirements
- [ ] Update version references if needed
- [ ] Archive the previous build in `/archive/previous` and ensure its `index.html` footer links back to `/`

---

## 🛠️ Technical Context

### **Current Architecture:**
- **Client-side only** - No server dependencies
- **Modular JavaScript** - Separate files for different concerns
- **Local storage** - All data persisted locally
- **Responsive CSS** - Mobile-first design with dark/light themes
- **External libraries** - Chart.js, Papa Parse, XLSX, jsPDF, JSZip

### **Key Data Structures:**
- **`inventory`** - Array of inventory items with all metadata
- **`spotPrices`** - Current spot prices for all metals  
- **`spotHistory`** - Historical price tracking
- **`apiConfig`** - API provider configuration
- **`elements`** - Cached DOM elements for performance

### **Important Constants:**
- **`APP_VERSION`** - Current version (in `constants.js`)
- **`METALS`** - Metal configuration object
- **Storage keys** - LocalStorage key constants
- **API providers** - Configuration for supported APIs

---

## 🔍 Debugging and Testing

### **Testing Your Changes:**
1. **Open `index.html`** directly in browser (file:// protocol)
2. **Import sample data** using `sample.csv`
3. **Test core workflows** - add items, edit, search, export
4. **Try edge cases** - empty data, large datasets, invalid inputs
5. **Check responsive design** - Mobile and desktop views
6. **Test theme switching** - Dark and light modes

### **Common Issues to Watch For:**
- **LocalStorage quota** - Large inventories might hit limits
- **Date parsing** - Multiple date formats need handling
- **XSS prevention** - All user input must be sanitized
- **Mobile compatibility** - Touch events, small screens
- **File protocol** - Some features work differently from file://

### **Performance Considerations:**
- **Large inventories** - Pagination and virtualization
- **Chart rendering** - Canvas performance with many data points
- **ZIP processing** - Progress indicators for large files
- **Search filtering** - Debouncing for large datasets

---

## 📞 Communication Protocols

### **When to Coordinate:**
- Working on HIGH CONFLICT RISK files
- Discovering issues that affect other subtasks
- Finding bugs or architectural problems
- Needing to modify shared components

### **What to Document:**
- Any deviations from original subtask requirements
- Performance issues discovered
- Browser compatibility problems
- Dependencies that weren't anticipated
- Suggestions for future improvements

### **How to Report Issues:**
- Update planning notes with technical discoveries
- Document workarounds for browser issues  
- Note any security considerations
- Flag breaking changes or API modifications

---

## ⚡ Quick Reference

### **Essential Files:**
- `docs/ROADMAP.md` - Your subtask list
- `docs/archive/notes/V3.2.0-PLANNING-NOTES.md` - Implementation details
- `docs/FUNCTIONSTABLE.md` - Lookup table for all functions
- `index.html` - Main application
- `js/constants.js` - Configuration and version
- `css/styles.css` - All styling
- `archive/previous/` - Snapshot of the last stable build for user rollback

### **Testing Workflow:**
1. **Unit test** your specific change
2. **Integration test** with existing features  
3. **Browser test** across major browsers
4. **Mobile test** if UI changes made
5. **Performance test** with large datasets

### **Quality Checklist:**
✅ Functional ✅ Integration ✅ Code Quality ✅ Browser Testing ✅ Documentation

### Release Documentation Checklist
- [ ] Update `docs/FUNCTIONSTABLE.md`
- [ ] Update `docs/CHANGELOG.md`
- [ ] Update `docs/IMPLEMENTATION_SUMMARY.md`
- [ ] Update `docs/ROADMAP.md`
- [ ] Update `docs/STATUS.md`
- [ ] Update `docs/STRUCTURE.md`

---

**Remember: Each subtask is designed to be completed independently while contributing to the larger v3.03.03a vision. Focus on quality over speed, and don't hesitate to coordinate with other agents when working on shared components.**

**Your contribution helps build a professional-grade inventory management system that serves users worldwide. Every subtask matters!** 🚀
