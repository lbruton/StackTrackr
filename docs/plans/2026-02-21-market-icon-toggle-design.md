# Market Icon Toggle - Design Document

**Date:** 2026-02-21
**Author:** Claude (via brainstorming session)
**Status:** Approved for implementation

## Overview

Add a Market icon toggle to the header buttons with a redesigned 3-column compact settings layout. This provides quick access to the retail market prices feature while addressing user feedback that the header buttons settings card is "too large and empty."

## Goals

1. Add Market icon to header that opens Settings → Market tab
2. Redesign Header Buttons settings card for more compact appearance
3. Add toggle control in Appearance settings
4. Default all header buttons to ON (visible) for new users

## User Story

**As a user**, I want a quick-access Market icon in the header **so that** I can jump to retail price data without navigating through the Settings menu.

## Architecture

### Component Changes

**Header Button (index.html)**
- Add new Market button between Currency and About buttons
- Use shopping bag icon (matches retail/commerce theme)
- ID: `headerMarketBtn`
- Class: `btn theme-btn header-toggle-btn`
- Default visible (no `style="display:none"`)

**Settings Panel (index.html)**
- Redesign "Header Buttons" card grid from 2x2 to 3-column layout
- Row 1: Theme | Currency | Market
- Row 2: Trend | Sync
- Add new Market toggle card with shopping bag icon reference
- Update grid class or add custom CSS for 3-column layout

**Constants (js/constants.js)**
- Add `HEADER_MARKET_BTN_KEY = "headerMarketBtnVisible"`
- Add to `ALLOWED_STORAGE_KEYS` array
- Default value: `"true"` (visible)

**Settings Logic (js/settings.js)**
- Add Market button visibility function (follows existing pattern)
- Check `localStorage.getItem(HEADER_MARKET_BTN_KEY)`
- Default to visible if not set
- Update all other header button defaults from hidden to visible

**Event Handlers (js/settings-listeners.js)**
- Market button click: `openSettings()` + switch to Market tab
- Market toggle switch: update localStorage + toggle visibility

### Data Flow

```
User clicks Market icon
  → openSettings() called
  → Switch active tab to "Market"
  → Settings modal opens showing Market tab

User toggles Market in settings
  → localStorage.setItem(HEADER_MARKET_BTN_KEY, "true"/"false")
  → Update button visibility immediately
  → Apply on next page load
```

## Visual Design

### Header Button Order (left to right)
1. Theme (sun icon)
2. Currency ($ icon)
3. Market (shopping bag icon) **← NEW**
4. Trend (activity icon)
5. Sync (refresh icon)
6. About (info icon)
7. Settings (gear icon)

### Settings Layout
```
┌─────────────────────────────────────────────────┐
│ HEADER BUTTONS                                  │
│ Optional buttons shown in the top-right...      │
├─────────────────────────────────────────────────┤
│  Theme          Currency         Market         │
│  [On] [Off]     [On] [Off]      [On] [Off]      │
│                                                  │
│  Trend          Sync                             │
│  [On] [Off]     [On] [Off]                      │
└─────────────────────────────────────────────────┘
```

### CSS Changes
- Add 3-column grid variant or update existing grid
- Reduce card padding for more compact appearance
- Maintain mobile responsiveness (may stack to 1-2 columns)

## Icon Choice

**Shopping bag icon** (Feather Icons):
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
  <line x1="3" y1="6" x2="21" y2="6"/>
  <path d="M16 10a4 4 0 0 1-8 0"/>
</svg>
```

Alternative: Store/storefront icon if shopping bag feels too "consumer purchase" vs "market data"

## Implementation Checklist

### Phase 1: Add Market Button to Header
- [ ] Add `<button id="headerMarketBtn">` with shopping bag SVG
- [ ] Position between Currency and About buttons
- [ ] Add `header-toggle-btn` class
- [ ] Default visible (no inline `display:none`)

### Phase 2: Update Constants
- [ ] Add `HEADER_MARKET_BTN_KEY = "headerMarketBtnVisible"`
- [ ] Add key to `ALLOWED_STORAGE_KEYS`

### Phase 3: Settings Panel UI
- [ ] Add Market toggle card to settings
- [ ] Redesign grid layout to 3 columns
- [ ] Update CSS for compact spacing

### Phase 4: Settings Logic
- [ ] Add Market visibility function in `settings.js`
- [ ] Change defaults for all buttons from hidden → visible
- [ ] Apply visibility on page load

### Phase 5: Event Handlers
- [ ] Market button click → open Settings + switch to Market tab
- [ ] Market toggle listener → update localStorage + visibility

### Phase 6: Testing
- [ ] Fresh install: all 5 buttons visible by default
- [ ] Toggle Market off → button hides
- [ ] Toggle Market on → button shows
- [ ] Click Market → Settings modal opens on Market tab
- [ ] Existing users: buttons remain in current state (no breaking changes)

## Migration Strategy

**New Users:** All 5 header buttons default to visible (ON).

**Existing Users:**
- Theme/Currency: remain in current state (likely visible)
- Trend/Sync: remain in current state (likely hidden unless manually enabled)
- Market: defaults to visible (new button, no prior state)

No breaking changes. Existing localStorage values are preserved.

## Future Enhancements

**Out of scope for this release:**
- Market button opening a slide-out panel (mentioned as "comes later")
- Retail prices dashboard on main page
- Quick-view market summary tooltip on hover

These can build on the foundation established in this release.

## Success Criteria

1. Market icon appears in header by default for new installs
2. Clicking Market opens Settings → Market tab
3. Settings panel has compact 3-column layout
4. All header buttons default to ON for new users
5. Toggle controls work for all 5 buttons
6. No visual regressions on mobile/tablet
7. localStorage migration works correctly for existing users

## Technical Decisions

**Why shopping bag icon?**
- Clear association with marketplace/commerce
- Consistent with retail/market terminology
- Visually distinct from other header icons

**Why 3-column layout?**
- Balances 5 items (3+2 rows)
- Addresses "too large" feedback
- Leaves room for potential 6th button (3+3)
- More compact without feeling cramped

**Why default all to ON?**
- Better discoverability for new users
- Shows off StakTrakr's feature set
- Users can hide what they don't need
- Aligns with "power user" target audience

## Risk Assessment

**Low risk:**
- Follows existing header button pattern exactly
- No complex state management
- Isolated changes (no ripple effects)

**Potential issues:**
- Mobile: 5 header buttons may feel crowded (monitor after release)
- 3-column settings layout might need responsive breakpoints

**Mitigation:**
- Test on mobile devices before release
- CSS media queries for responsive grid
- Can always revert to 2-column if needed

## Conclusion

This design adds the Market icon toggle using StakTrakr's existing header button pattern while making the settings panel more compact and balanced. The implementation is straightforward, low-risk, and sets the foundation for future market data quick-access features.
