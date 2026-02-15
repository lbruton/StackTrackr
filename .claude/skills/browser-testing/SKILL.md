---
name: browser-testing
description: Browser automation patterns for StackTrackr UI testing — screenshots, accessibility snapshots, interaction recording, theme/scaling verification. Use when testing UI, taking screenshots, running Chrome DevTools, or verifying themes/layouts.
user-invocable: false
---

# StackTrackr Browser Testing

Patterns and workflows for testing the StackTrackr UI using Chrome MCP tools. Use this skill when working on themes, layout scaling, responsive design, visual regression, or any task that requires viewing or interacting with the live UI.

---

## Quick Start

### 1. Start the local server

StackTrackr must be served over HTTP for full browser tool access:

```bash
python3 -m http.server 8888
# Access at http://localhost:8888/index.html
```

Keep the server running in the background for the duration of the testing session.

### 2. Choose the right tool

| Task | Tool | Why |
|------|------|-----|
| Navigate to the app | `chrome-devtools` `navigate_page` | Handles both `file://` and `http://` without URL mangling |
| Full UI structure analysis | `chrome-devtools` `take_snapshot` | Returns accessibility tree with UIDs for every element |
| Visual screenshot | `chrome-devtools` `take_screenshot` | Pixel-accurate, good for layout/color verification |
| Click/interact with elements | `claude-in-chrome` `computer` or `find` | Better interaction model for click, type, scroll |
| Record multi-step interaction | `claude-in-chrome` `gif_creator` | Creates GIF of browser interactions for user review |
| Run JS in page context | `chrome-devtools` `evaluate_script` | Inspect app state, computed styles, DOM queries |
| Read console output | `claude-in-chrome` `read_console_messages` | Check for errors, debug output, warnings |
| Monitor network requests | `claude-in-chrome` `read_network_requests` | Verify API calls, check for failed fetches |

### 3. Session setup pattern

```
1. tabs_context_mcp          → get current browser state
2. Start HTTP server          → python3 -m http.server 8888
3. navigate_page             → http://localhost:8888/index.html
4. take_screenshot           → verify app loaded correctly
5. take_snapshot             → get full accessibility tree for analysis
```

---

## Tool-Specific Patterns

### chrome-devtools (preferred for inspection)

**Navigation** — use `navigate_page`. Works with both protocols:
- HTTP: `http://localhost:8888/index.html`
- File: `file:///Volumes/DATA/GitHub/StackTrackr/index.html`

**Accessibility snapshots** — use `take_snapshot`. Returns a structured tree:
```
uid=1_0 RootWebArea "StakTrakr" url="http://localhost:8888/index.html"
  uid=1_1 heading "StakTrakr" level="1"
  uid=1_2 button "About" description="About"
  uid=1_3 button "Settings" description="Settings"
  ...
```

Each element has a `uid` that can be used with `click`, `fill`, and other interaction tools. Save snapshots to `logs/sprint/ui-snapshot.txt` for reference across sessions.

**Script evaluation** — use `evaluate_script` for in-page inspection:
```javascript
// Check current theme
document.documentElement.getAttribute('data-bs-theme')

// Count inventory items
inventory.length

// Get computed style
getComputedStyle(document.querySelector('.spot-card')).backgroundColor

// Check feature flags
JSON.stringify(window.featureFlags)
```

### claude-in-chrome (preferred for interaction)

**Always start with** `tabs_context_mcp` to get fresh tab IDs.

**Screenshots** — use for visual comparison during theme work. Can screenshot specific elements or full page.

**Interaction** — use `find` to locate elements, then `computer` for click/type actions. The `form_input` tool is useful for filling forms (e.g., the add/edit item modal).

**GIF recording** — use `gif_creator` for multi-step interactions:
1. Start recording
2. Perform actions (navigate, click, scroll)
3. Capture extra frames before/after each action for smooth playback
4. Name files meaningfully: `theme_switch_dark.gif`, `add_item_flow.gif`

**Page reading** — `read_page` works on localhost but StackTrackr's single-page HTML is very dense. Tips:
- Use CSS selectors to target specific sections: `read_page` with a selector like `#inventoryTable`
- For full-page analysis, prefer `chrome-devtools` `take_snapshot` instead
- If output is truncated, use `evaluate_script` to extract specific data

---

## Known Limitations

### file:// protocol issues

| Tool | file:// behavior |
|------|-----------------|
| `claude-in-chrome` `navigate` | Prepends `https://` — breaks `file://` URLs |
| `claude-in-chrome` `read_page` | Cannot read `file://` pages even with "Allow access to file URLs" Chrome permission |
| `chrome-devtools` `navigate_page` | Works correctly with `file://` URLs |
| `chrome-devtools` `take_screenshot` | Works on `file://` pages |
| `chrome-devtools` `take_snapshot` | Works on `file://` pages |

**Recommendation**: Always use the HTTP server (`localhost:8888`) for consistency. Both tool sets work reliably over HTTP.

### Output size limits

StackTrackr is a single HTML page with dense DOM. Some tools hit character limits:
- `read_page` at depth > 1 can exceed output limits
- `take_snapshot` returns ~400 lines for the full app — manageable but large
- Use `evaluate_script` with targeted DOM queries for specific element inspection

### Stability

- Opening too many tabs via MCP tools can crash Chrome
- Create tabs sparingly — reuse existing tabs when possible
- If Chrome becomes unresponsive, the user needs to manually close tabs/restart Chrome
- After Chrome restart, always call `tabs_context_mcp` to get fresh tab state

---

## Testing Workflows

### Theme verification

When testing theme changes (light / dark / sepia / system):

```
1. Navigate to app
2. take_screenshot → baseline (current theme)
3. evaluate_script → document.querySelector('[data-theme-btn="dark"]').click()
4. take_screenshot → dark theme applied
5. Compare: check backgrounds, text colors, card borders, chart colors
6. Repeat for each theme
```

Key elements to verify per theme:
- Spot price cards (`.spot-card`) — background, text, trend indicators
- Inventory table — header colors, row striping, hover states
- Modals — backdrop, header, body, footer contrast
- Charts — line colors, grid, labels, legend
- Navigation — brand text, button states

### Layout/scaling verification

When testing responsive design or scaling fixes:

```
1. Navigate to app
2. take_snapshot → get full element tree
3. evaluate_script → check computed widths, overflow, visibility
4. resize_page (chrome-devtools) → test at different viewport sizes
5. take_screenshot at each size → visual comparison
```

Common breakpoints to test:
- Desktop: 1920x1080, 1440x900
- Tablet: 1024x768, 768x1024
- Mobile: 375x667, 414x896

### Interaction testing

When testing user flows (add item, edit, bulk operations):

```
1. gif_creator → start recording
2. Navigate to starting state
3. Perform user actions (click, fill forms, submit)
4. Capture result state
5. gif_creator → save recording
```

---

## File Locations

| File | Purpose |
|------|---------|
| `logs/sprint/ui-snapshot.txt` | Saved accessibility tree snapshots |
| `logs/sprint/*.gif` | Recorded browser interaction GIFs |
| `logs/sprint/screenshot_*.png` | Saved screenshots for comparison |

---

## Cleanup

When done with browser testing:

1. **Kill the HTTP server**: `lsof -ti:8888 | xargs kill`
2. **Close extra Chrome tabs** opened during testing
3. **Save useful snapshots** to `logs/sprint/` for future reference
4. **Note any UI issues found** in the handoff file if using the `/loop` workflow
