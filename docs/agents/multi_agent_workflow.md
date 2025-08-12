# Multi-Agent Development Workflow - StackrTrackr v3.04.34

> **⚠️ NOTICE: `docs/agents/agents.ai` is the primary development reference for token efficiency. This file is maintained for consistency only.**

> **Latest release: v3.04.34**

## 🎯 Project Overview

You are contributing to **StackrTrackr v3.04.33**, a comprehensive client-side web application for tracking precious metal investments (Silver, Gold, Platinum, Palladium). The project uses a modular JavaScript architecture with local storage, responsive CSS theming, and advanced features like API integration, data visualization, and comprehensive import/export capabilities.

**Current Status**: v3.04.34 (stable)
**Your Role**: Complete focused v3.04.x patch tasks as part of a coordinated multi-agent development effort

---

## 🏗️ Multi-Agent Workflow

### **How This Works**
- Development progresses through incremental **v3.04.x patch releases**
- Each patch entry is designed for **~2 hour completion**
- **Multiple agents work in parallel** on different patch entries
- **Coordination system** prevents conflicts and ensures quality
- **Roadmap entries** track progress and assignments

### **Your Responsibilities**
1. **Pick up an available patch entry** from the roadmap
2. **Check dependencies or prerequisites** before starting work
3. **Complete the patch** following quality standards
4. **Test your changes** thoroughly
5. **Bump the version and update all docs** after completing the patch
6. **Document your work** and any findings
7. **Mark the patch entry as complete** in the roadmap

---

## 📋 How to Get Started

### **Step 1: Read the Documentation**
Before starting any patch entry, read these files:
- `docs/roadmap.md` - Patch release roadmap (v3.04.x entries)
- `docs/agents/agents.ai` - Current development context and notes
- `docs/status.md` - Current project status
- `docs/structure.md` - Project architecture and file organization
- `docs/ui_style_guide.md` - UI color, typography, and component conventions
- `docs/functionstable.md` - Reference table of all JavaScript functions

### **Step 2: Choose Your Patch Entry**
1. **Review available patch entries** in `docs/roadmap.md`
2. **Check dependencies** – some patches require others to complete first
3. **Verify file conflicts** – avoid working on high-conflict files simultaneously
4. **Announce your choice** if coordinating with other agents

### **Step 3: Understand the Context**
- **Read the current codebase** in the relevant files
- **Understand existing patterns** and architecture
- **Review related patches** to understand the bigger picture
- **Check for any existing work** that might affect your patch

---

## 🎯 Patch Execution Guidelines

### **Quality Standards (Required for Every Patch)**

#### ✅ **Functional Testing**
- Verify your changes work as intended
- Test with both empty and populated data
- Check all user interaction scenarios
- Verify mobile and desktop responsiveness
- Test all three themes (dark, light, sepia)

#### ✅ **Integration Testing**  
- Ensure no breaking changes to existing features
- Test spot price calculations, inventory management, search, etc.
- Verify import/export functionality still works
- Check theme switching and modal behavior
- Test file:// protocol compatibility

#### ✅ **Code Quality**
- Follow existing code patterns and conventions
- Use consistent naming and formatting
- Add JSDoc comments for new functions
- Keep functions focused and modular
- Use existing utility functions where possible

#### ✅ **Browser Compatibility**
- Test in Chrome, Firefox, Safari, Edge
- Verify file:// protocol compatibility (open index.html directly)
- Check mobile browsers if making UI changes
- Test with localStorage enabled/disabled
- Verify external library compatibility

#### ✅ **Documentation Updates**
- Update relevant code comments
- Add any new configuration to constants.js
- Update planning notes if you discover issues
- Document any architectural decisions
- For every completed patch, **bump the version** and update:
  - `js/constants.js` - Update APP_VERSION
  - `docs/functionstable.md` - Add new functions
  - `docs/changelog.md` - Document changes
  - `docs/roadmap.md` - Mark entry complete
  - `docs/agents/multi_agent_workflow.md` - Update version references

### **File Modification Guidelines**

#### **HIGH CONFLICT RISK FILES** ⚠️ (Coordinate Carefully)
- `index.html` - Main application structure, frequently modified
- `js/events.js` - Central event handler logic, complex dependencies
- `css/styles.css` - Shared styling, theme-dependent

**When working on these files:**
- Check with other agents working nearby patches
- Make focused, minimal changes
- Test thoroughly for conflicts
- Document exactly what you changed
- Use git-style diffs when possible

#### **MEDIUM CONFLICT RISK FILES** ⚠️
- `js/api.js` - API integration logic
- `js/inventory.js` - Core data management
- `js/theme.js` - Theme switching logic

#### **LOW CONFLICT RISK FILES** ✅ (Safe for Parallel Work)
- Documentation files (.md)
- Individual modal HTML/CSS sections
- Utility functions
- New feature modules
- `js/constants.js` (except version changes)

---

## 📝 Patch Completion Checklist

### **Before You Start:**
- [ ] Read all relevant documentation files
- [ ] Understand the patch requirements thoroughly
- [ ] Check dependencies are met
- [ ] Verify no file conflicts with other agents
- [ ] Review related code sections
- [ ] Check current version in constants.js

### **During Development:**
- [ ] Follow existing code patterns and conventions
- [ ] Make focused, minimal changes
- [ ] Test incrementally as you work
- [ ] Document any issues or discoveries
- [ ] Keep changes organized and clean
- [ ] Use descriptive variable names and comments

### **Before Submitting:**
- [ ] **Functional testing** - Does it work as intended?
- [ ] **Integration testing** - Did you break anything?
- [ ] **Theme testing** - Works in dark, light, and sepia modes?
- [ ] **Code quality** - Clean, documented, consistent?
- [ ] **Browser testing** - Works across major browsers?
- [ ] **Mobile testing** - Responsive on small screens?
- [ ] **Documentation** - Updated relevant docs/comments?
- [ ] **File cleanup** - Removed debug code, organized changes?

### **After Completion:**
- [ ] Bump the version in `js/constants.js`
- [ ] Update `docs/changelog.md` with your changes
- [ ] Update `docs/functionstable.md` if you added functions
- [ ] Mark the patch entry as complete in `docs/roadmap.md`
- [ ] Update version references in `docs/agents/multi_agent_workflow.md`
- [ ] Document any findings that affect other patches
- [ ] Note any changes to original requirements
- [ ] Archive the previous build in `/archive/v_previous` and ensure its `index.html` footer links back to `/`

---

## 🛠️ Technical Context

### **Current Architecture:**
- **Client-side only** - No server dependencies, works from file://
- **Modular JavaScript** - Separate files for different concerns
- **Local storage** - All data persisted locally using localStorage
- **Responsive CSS** - Mobile-first design with 3 themes (dark/light/sepia)
- **External libraries** - Chart.js, Papa Parse, XLSX, jsPDF, JSZip loaded from CDN

### **Key Data Structures:**
- **`inventory`** - Array of inventory items with all metadata
- **`spotPrices`** - Current spot prices for all four metals  
- **`spotHistory`** - Historical price tracking with timestamps
- **`apiConfig`** - API provider configuration and keys
- **`elements`** - Cached DOM elements for performance
- **`catalogMap`** - Serial number to catalog ID mapping

### **Important Constants:**
- **`APP_VERSION`** - Current version (in `js/constants.js`)
- **`METALS`** - Metal configuration object with defaults
- **Storage keys** - LocalStorage key constants
- **API providers** - Configuration for supported metal pricing APIs
- **`THEME_KEY`** - LocalStorage key for theme preference

### **Supported Features:**
- **Multi-metal tracking** - Silver, Gold, Platinum, Palladium
- **Spot price management** - Manual entry and API sync
- **Import/Export** - CSV, JSON, Excel, PDF formats
- **Data visualization** - Pie charts and analytics
- **Theme support** - Dark, light, and sepia modes
- **Mobile responsive** - Touch-friendly interface
- **Search and filtering** - Real-time inventory filtering
- **Collectable tracking** - Special handling for numismatic items

---

## 🔍 Debugging and Testing

### **Testing Your Changes:**
1. **Open `index.html`** directly in browser (file:// protocol)
2. **Import sample data** using `sample.csv`
3. **Test core workflows** - add items, edit, search, export
4. **Try edge cases** - empty data, large datasets, invalid inputs
5. **Check responsive design** - Mobile and desktop views
6. **Test all three themes** - Dark, light, and sepia modes
7. **Test API functionality** - If you have API keys configured
8. **Verify localStorage** - Data persistence across browser sessions

### **Common Issues to Watch For:**
- **LocalStorage quota** - Large inventories might hit 5-10MB limits
- **Date parsing** - Multiple date formats need proper handling
- **XSS prevention** - All user input must be sanitized
- **Mobile compatibility** - Touch events, small screens, virtual keyboards
- **File protocol** - Some features work differently from file://
- **Theme consistency** - Components should work in all three themes
- **API rate limits** - Respect provider quotas and caching

### **Performance Considerations:**
- **Large inventories** - Use pagination and debounced search
- **Chart rendering** - Canvas performance with many data points
- **ZIP processing** - Show progress indicators for large files
- **Search filtering** - Debounce input for responsive filtering
- **Modal animations** - Smooth transitions without blocking UI

### **Browser-Specific Issues:**
- **Safari** - Date input formatting, localStorage quotas
- **Firefox** - File download behavior, theme detection
- **Chrome** - Memory usage with large datasets
- **Edge** - Legacy compatibility considerations
- **Mobile browsers** - Touch events, keyboard behavior

---

## 📞 Communication Protocols

### **When to Coordinate:**
- Working on HIGH CONFLICT RISK files (index.html, events.js, styles.css)
- Discovering issues that affect other patches
- Finding bugs or architectural problems
- Needing to modify shared components or constants
- Making breaking changes to APIs or data structures

### **What to Document:**
- Any deviations from original patch requirements
- Performance issues discovered during testing
- Browser compatibility problems and workarounds
- Dependencies that weren't anticipated in planning
- Suggestions for future improvements or refactoring
- Security considerations or potential vulnerabilities

### **How to Report Issues:**
- Update relevant documentation with technical discoveries
- Document workarounds for browser-specific issues  
- Note any security considerations or input validation needs
- Flag breaking changes or API modifications clearly
- Provide reproduction steps for bugs discovered
- Suggest testing scenarios for related patches

---

## ⚡ Quick Reference

### **Essential Files for Every Patch:**
- `docs/roadmap.md` - Current patch release list
- `docs/agents/agents.ai` - Development context and notes
- `docs/functionstable.md` - Lookup table for all JavaScript functions
- `index.html` - Main application entry point
- `js/constants.js` - Configuration, version, and constants
- `css/styles.css` - All styling and theme definitions

### **Testing Workflow:**
1. **Unit test** your specific change in isolation
2. **Integration test** with existing features and workflows
3. **Theme test** across all three themes (dark/light/sepia)
4. **Browser test** across Chrome, Firefox, Safari, Edge
5. **Mobile test** if UI changes were made
6. **Performance test** with realistic datasets
7. **File protocol test** by opening index.html directly

### **Quality Checklist:**
✅ **Functional** - Works as intended
✅ **Integration** - No breaking changes  
✅ **Themes** - Works in all three themes
✅ **Code Quality** - Clean, documented, consistent
✅ **Browser Testing** - Cross-browser compatibility
✅ **Documentation** - Updated docs and comments

### **Version Update Checklist:**
- [ ] Update `APP_VERSION` in `js/constants.js`
- [ ] Add entry to `docs/changelog.md`
- [ ] Update `docs/functionstable.md` if needed
- [ ] Mark patch complete in `docs/roadmap.md`
- [ ] Update version references in `docs/agents/multi_agent_workflow.md`

### **File Conflict Resolution:**
- **Before editing** - Check what other agents are working on
- **During editing** - Make minimal, focused changes
- **After editing** - Document exactly what changed
- **If conflicts arise** - Communicate with other agents immediately

---

**Remember: Each patch entry is designed to be completed independently while contributing to the larger StackrTrackr vision. Focus on quality over speed, and don't hesitate to coordinate with other agents when working on shared components.**

**Your contribution helps build a professional-grade inventory management system that serves users worldwide. Every patch matters!** 🚀

---

## 📚 Additional Resources

### **Key Documentation Files:**
- `README.md` - Project overview and installation
- `docs/changelog.md` - Complete version history
- `docs/structure.md` - Project file organization
- `docs/ui_style_guide.md` - Design system and conventions
- `sample.csv` - Example data for testing

### **Development Tools:**
- Browser developer tools for debugging
- Lighthouse for performance auditing
- Can I Use for browser compatibility checking
- Local web server for testing (though file:// works too)

### **External Dependencies:**
- Chart.js v3.9.1 - Data visualization
- Papa Parse v5.4.1 - CSV parsing
- XLSX v0.18.5 - Excel file handling
- jsPDF v2.5.1 - PDF generation
- JSZip v3.10.1 - Archive creation

**Happy coding! 🎯**
