# Screenshot Generation Procedure

This document outlines the process for generating professional screenshots of the StackTrackr application for documentation, GitHub README, and marketing materials.

## Overview

We use Claude Haiku (lowest cost AI model) with Playwright browser automation tools to capture consistent, high-quality screenshots of the application.

## Prerequisites

### Required Extensions

- **Claude Code for VSCode** (`anthropic.claude-dev`) - installed ✅
- **Playwright MCP Tools** - available via MCP integration ✅

### Required Access

- Claude Haiku model (check in Claude Code extension settings)
- Live StackTrackr application at `https://www.stackrtrackr.com/`

## Cost-Effective Screenshot Strategy

### Model Selection Priority

1. **Claude Haiku** (cheapest) - Recommended for screenshots ⭐
2. **GPT-4o-mini** (low cost) - Fallback option
3. **Manual** (free) - Most cost-effective overall

### Tool Selection

- **Playwright Browser Automation** - Consistent, programmatic screenshots
- **Built-in Browser Tools** - Manual fallback (Cmd+Shift+4 on Mac)

## Screenshot Procedure

### Step 1: Prepare the Application

```bash
# Navigate to StackTrackr directory
cd /Volumes/DATA/GitHub/StackTrackr

# Ensure sample data is loaded (if needed)
# Check that the application is running at https://www.stackrtrackr.com/
```

### Step 2: Activate Playwright Tools

In VS Code, use the following MCP tools:

- `mcp_playwright_browser_navigate` - Navigate to the application
- `mcp_playwright_browser_snapshot` - Get page accessibility snapshot
- `mcp_playwright_browser_take_screenshot` - Capture screenshots

### Step 3: Screenshot Checklist

#### Required Screenshots

1. **Homepage/Dashboard** - Full application view with spot prices
2. **Inventory Table** - Main data table showing items
3. **Summary Cards** - Metal totals and statistics
4. **Spot Prices Dashboard** - Price tracking section
5. **Full Demo** - Complete application overview

#### Screenshot Specifications

- **Format**: PNG (default)
- **Quality**: High resolution
- **Viewport**: Standard desktop size (1200x800 or larger)
- **Naming Convention**: `stackrtrackr-[section]-screenshot.png`

### Step 4: Execute Screenshot Generation

#### Using Claude Haiku + Playwright (Recommended)

```markdown
Prompt Template for Claude Haiku:
---
Please take professional screenshots of the StackTrackr application using Playwright tools:

1. Navigate to https://www.stackrtrackr.com/
2. Take a full-page screenshot of the homepage
3. Take a focused screenshot of the inventory table
4. Take a screenshot of the summary cards section
5. Save all screenshots to the images/screenshots/ directory

Use proper naming: stackrtrackr-[section].png
Ensure high quality and consistent formatting.
---
```

#### Manual Fallback Process

1. Open <https://www.stackrtrackr.com/> in browser
2. Use built-in screenshot tools:
   - **Mac**: Cmd+Shift+4 (selection) or Cmd+Shift+3 (full screen)
   - **Windows**: Windows+Shift+S
3. Save to `/images/screenshots/` directory
4. Follow naming convention

### Step 5: Post-Processing

#### File Management

```bash
# Copy screenshots to correct directory
cp .playwright-mcp/*.png images/screenshots/

# Verify screenshots
ls -la images/screenshots/
```

#### Quality Check

- [ ] All required sections captured
- [ ] High resolution and clarity
- [ ] Consistent viewport size
- [ ] Proper file naming
- [ ] No sensitive data visible

## Known Issues & Workarounds

### Weight Display Bug

**Issue**: Application may show "NaN oz" for weight values due to CSV import mapping bug.

**Workarounds**:

1. **Document the bug** in screenshots with note
2. **Manually fix data** before screenshots (temporary)
3. **Include bug note** in README

### Application State

**Ensure consistent state**:

- Sample data loaded
- Filters set appropriately
- No error messages visible
- Professional appearance

## File Locations

### Screenshot Directory

```text
/images/screenshots/
├── stackrtrackr-homepage.png
├── stackrtrackr-inventory-table.png
├── stackrtrackr-summary-cards.png
├── stackrtrackr-spot-prices-dashboard.png
└── stackrtrackr-full-demo-screenshot.png
```

### Documentation Integration

- Update README.md with new screenshots
- Include in GitHub repository
- Use for marketing materials

## Cost Analysis

### AI Model Costs (Estimated)

- **Claude Haiku**: ~$0.50-1.00 per screenshot session
- **GPT-4o-mini**: ~$1.00-2.00 per screenshot session
- **Claude Sonnet**: ~$3.00-5.00 per screenshot session
- **Manual**: Free (time investment only)

### Recommendation

Use **Claude Haiku** for automated screenshot generation - provides good quality at minimal cost while maintaining consistency and professional appearance.

## Troubleshooting

### Common Issues

1. **Playwright not responding**: Restart VS Code, check MCP connection
2. **Application not loading**: Verify URL and internet connection
3. **Screenshots too small**: Adjust viewport size in Playwright
4. **File not saving**: Check directory permissions

### Debug Commands

```bash
# Check if screenshots were created
ls -la .playwright-mcp/

# Verify file sizes
du -h images/screenshots/*

# Check Playwright MCP status
# (Use VS Code MCP tools diagnostics)
```

## Updates and Maintenance

### When to Update Screenshots

- Major UI changes
- New features added
- Bug fixes affecting visual appearance
- Quarterly for marketing materials

### Version Control

- Commit screenshots to Git repository
- Use descriptive commit messages
- Tag releases with screenshot updates

---

**Last Updated**: August 15, 2025  
**Procedure Version**: 1.0  
**Tested With**: Claude Haiku, Playwright MCP Tools, StackTrackr v1.0
