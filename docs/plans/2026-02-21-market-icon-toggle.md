# Market Icon Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add Market icon toggle to header buttons with compact 3-column settings layout

**Architecture:** Follow existing header button pattern (Theme/Currency/Trend/Sync). Add 5th button with shopping bag icon that opens Settings → Market tab. Redesign settings card from 2x2 grid to 3-column (3+2 rows). Default all buttons to visible for new users.

**Tech Stack:** Vanilla JavaScript, localStorage, CSS Grid, Feather Icons

---

## Task 1: Add Market Button Constants

**Files:**
- Modify: `js/constants.js`

**Step 1: Add HEADER_MARKET_BTN_KEY constant**

Find the section with `HEADER_TREND_BTN_KEY` and `HEADER_SYNC_BTN_KEY` (around line 626-630) and add:

```javascript
/** @constant {string} HEADER_MARKET_BTN_KEY - LocalStorage key for header market button visibility */
const HEADER_MARKET_BTN_KEY = "headerMarketBtnVisible";
```

**Step 2: Add to ALLOWED_STORAGE_KEYS**

Find the `ALLOWED_STORAGE_KEYS` array (around line 742-743) and add the new key:

```javascript
HEADER_TREND_BTN_KEY,       // boolean string: "true"/"false" — header trend button visibility
HEADER_SYNC_BTN_KEY,        // boolean string: "true"/"false" — header sync button visibility
HEADER_MARKET_BTN_KEY,      // boolean string: "true"/"false" — header market button visibility
```

**Step 3: Verify constants are exported**

Check that `HEADER_MARKET_BTN_KEY` is included in the file's exports or globals (if applicable).

**Step 4: Commit**

```bash
git add js/constants.js
git commit -m "feat: add HEADER_MARKET_BTN_KEY constant

Add localStorage key for Market header button visibility toggle.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Market Button to Header

**Files:**
- Modify: `index.html` (lines ~388-415)

**Step 1: Find Currency button location**

Locate the Currency button (id=`headerCurrencyBtn`) around line 388.

**Step 2: Add Market button after Currency**

Insert new Market button between Currency and Trend buttons:

```html
<!-- Market button (STACK-XXX) -->
<button class="btn theme-btn header-toggle-btn" id="headerMarketBtn"
        title="Market prices" aria-label="Market prices">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
</button>
```

**Step 3: Verify button order**

Confirm header buttons appear in this order:
1. Theme
2. Currency
3. Market **← NEW**
4. Trend
5. Sync
6. About
7. Settings

**Step 4: Test in browser**

Open `index.html` in browser, verify Market icon appears in header (shopping bag icon).

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add Market button to header

Add shopping bag icon between Currency and Trend buttons.
Default visible (no display:none).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Market Toggle to Settings Panel

**Files:**
- Modify: `index.html` (lines ~2119-2156)

**Step 1: Find Header Buttons settings section**

Locate the "Header Buttons" fieldset (around line 2119).

**Step 2: Add Market toggle card**

Insert new card after Currency card (before Trend):

```html
<div class="settings-card">
  <div class="settings-group-label">Market</div>
  <p class="settings-subtext">Open market prices.</p>
  <div class="chip-sort-toggle" id="settingsHeaderMarketBtn_hdr">
    <button type="button" class="chip-sort-btn" data-val="yes">On</button>
    <button type="button" class="chip-sort-btn" data-val="no">Off</button>
  </div>
</div>
```

**Step 3: Verify settings card layout**

Current HTML should have 5 cards total:
1. Theme
2. Currency
3. Market **← NEW**
4. Trend
5. Sync

**Step 4: Test in browser**

Open Settings → Appearance, verify Market toggle appears with On/Off buttons.

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add Market toggle to settings panel

Add Market card to Header Buttons section in Appearance settings.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update CSS for 3-Column Grid Layout

**Files:**
- Modify: `css/styles.css`

**Step 1: Find settings-card-grid--compact styles**

Search for `.settings-card-grid--compact` or `.settings-card-grid`.

**Step 2: Update grid to 3 columns**

Modify or add CSS for 3-column layout:

```css
.settings-card-grid--compact {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

/* Mobile: stack to 1 column */
@media (max-width: 768px) {
  .settings-card-grid--compact {
    grid-template-columns: 1fr;
  }
}

/* Tablet: 2 columns */
@media (min-width: 769px) and (max-width: 1024px) {
  .settings-card-grid--compact {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

**Step 3: Reduce card padding (optional)**

Optionally make cards more compact:

```css
.settings-card-grid--compact .settings-card {
  padding: 0.75rem;  /* Reduce from default if needed */
}
```

**Step 4: Test responsive layout**

1. Desktop: 3 columns (Theme | Currency | Market) / (Trend | Sync)
2. Tablet: 2 columns
3. Mobile: 1 column stacked

**Step 5: Commit**

```bash
git add css/styles.css
git commit -m "style: update Header Buttons grid to 3-column layout

Change from 2x2 to 3-column responsive grid (3+2 rows).
Add mobile/tablet breakpoints for stacking.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Market Button Visibility Logic

**Files:**
- Modify: `js/settings.js` (around line 1080)

**Step 1: Find existing header button visibility function**

Locate the function that handles header button visibility (likely named something like `applyHeaderButtonVisibility` or similar around line 1080).

**Step 2: Add Market button visibility**

Add Market button check following the existing pattern:

```javascript
// Market button (STACK-XXX)
const marketBtn = safeGetElement("headerMarketBtn");
const marketVisible = localStorage.getItem(HEADER_MARKET_BTN_KEY) !== "false";  // default true
if (marketBtn) {
  marketBtn.style.display = marketVisible ? "" : "none";
}
```

**Step 3: Update default values for all buttons**

Change Trend and Sync defaults from `"false"` to `"true"`:

```javascript
// Trend button - default visible (changed from hidden)
const trendVisible = localStorage.getItem(HEADER_TREND_BTN_KEY) !== "false";

// Sync button - default visible (changed from hidden)
const syncVisible = localStorage.getItem(HEADER_SYNC_BTN_KEY) !== "false";
```

**Step 4: Test visibility logic**

1. Fresh localStorage (clear): all 5 buttons visible
2. Set `HEADER_MARKET_BTN_KEY = "false"`: Market button hidden
3. Set `HEADER_MARKET_BTN_KEY = "true"`: Market button visible

**Step 5: Commit**

```bash
git add js/settings.js
git commit -m "feat: add Market button visibility logic

Add visibility check for Market header button.
Default all header buttons to visible (ON) for new users.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Wire Market Button Click Handler

**Files:**
- Modify: `js/settings-listeners.js` (around line 131-162)

**Step 1: Find header button click handlers section**

Locate the section with Trend/Sync/Theme/Currency button listeners.

**Step 2: Add Market button click handler**

Add Market button click handler:

```javascript
// Market button - open Settings → Market tab (STACK-XXX)
const headerMarketBtn = safeGetElement("headerMarketBtn");
if (headerMarketBtn) {
  safeAttachListener(headerMarketBtn, "click", () => {
    openSettings();
    // Switch to Market tab
    const marketTab = document.querySelector('[data-settings-tab="market"]');
    if (marketTab) {
      marketTab.click();
    }
  }, "Header market button");
}
```

**Step 3: Test button click**

Click Market icon → Settings modal opens → Market tab is active.

**Step 4: Commit**

```bash
git add js/settings-listeners.js
git commit -m "feat: wire Market button click handler

Market button opens Settings modal and switches to Market tab.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Wire Market Toggle Settings Listener

**Files:**
- Modify: `js/settings-listeners.js`

**Step 1: Find settings toggle listeners**

Locate where other header button toggles are wired (Theme, Currency, Trend, Sync).

**Step 2: Add Market toggle listener**

Add Market toggle following existing pattern:

```javascript
// Market header button toggle (STACK-XXX)
const marketToggle = document.getElementById("settingsHeaderMarketBtn_hdr");
if (marketToggle) {
  safeAttachListener(marketToggle, "click", (e) => {
    if (e.target.classList.contains("chip-sort-btn")) {
      const val = e.target.dataset.val === "yes";
      localStorage.setItem(HEADER_MARKET_BTN_KEY, val.toString());

      // Update button visibility immediately
      const marketBtn = safeGetElement("headerMarketBtn");
      if (marketBtn) {
        marketBtn.style.display = val ? "" : "none";
      }

      // Update toggle UI
      marketToggle.querySelectorAll(".chip-sort-btn").forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.val === (val ? "yes" : "no"))
      );
    }
  }, "Settings market button toggle");
}
```

**Step 3: Add initial toggle state on settings open**

Find where settings toggles are initialized and add Market:

```javascript
// Set Market toggle state
const marketToggle = document.getElementById("settingsHeaderMarketBtn_hdr");
if (marketToggle) {
  const marketVisible = localStorage.getItem(HEADER_MARKET_BTN_KEY) !== "false";
  marketToggle.querySelectorAll(".chip-sort-btn").forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.val === (marketVisible ? "yes" : "no"))
  );
}
```

**Step 4: Test toggle**

1. Open Settings → Appearance
2. Market toggle shows "On" (active)
3. Click "Off" → Market button hides from header
4. Click "On" → Market button reappears
5. Refresh page → state persists

**Step 5: Commit**

```bash
git add js/settings-listeners.js
git commit -m "feat: wire Market toggle settings listener

Add toggle control for Market button visibility in settings panel.
Updates localStorage and button visibility immediately.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Manual Testing & Verification

**Files:**
- None (testing only)

**Step 1: Test new user experience**

1. Clear localStorage: `localStorage.clear()`
2. Refresh page
3. Verify all 5 header buttons visible: Theme, Currency, Market, Trend, Sync

**Step 2: Test Market button functionality**

1. Click Market icon
2. Verify Settings modal opens
3. Verify Market tab is active

**Step 3: Test toggle controls**

For each button (Theme, Currency, Market, Trend, Sync):
1. Open Settings → Appearance
2. Toggle button Off → button hides from header
3. Toggle button On → button reappears
4. Refresh page → state persists

**Step 4: Test responsive layout**

1. Desktop (> 1024px): 3-column grid
2. Tablet (769-1024px): 2-column grid
3. Mobile (< 768px): 1-column stack

**Step 5: Test existing user migration**

1. Set some buttons to hidden in localStorage before refresh
2. Verify existing state is preserved
3. Verify Market button defaults to visible (new key)

**Step 6: Document test results**

Create checklist:
- [ ] Fresh install: all 5 buttons visible
- [ ] Market click opens Settings → Market tab
- [ ] All toggles work (on/off/persist)
- [ ] Responsive grid works (3-col/2-col/1-col)
- [ ] Existing user states preserved
- [ ] No console errors
- [ ] No visual regressions

---

## Task 9: Final Commit & Cleanup

**Step 1: Run final visual check**

1. Check header button alignment
2. Check settings card spacing/padding
3. Check mobile layout
4. Check dark/sepia themes

**Step 2: Update sw.js cache (if needed)**

If `index.html` or `css/styles.css` were modified, the pre-commit hook should auto-update `sw.js` CACHE_NAME.

Verify `sw.js` was updated:
```bash
git status
# Should show sw.js as modified if hook ran
```

**Step 3: Final commit (if any loose changes)**

```bash
git add -A
git commit -m "chore: final cleanup for Market icon toggle

Verify all changes committed and cache updated.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 4: Test in file:// protocol**

Open `index.html` directly (not via http server) to verify file:// compatibility.

**Step 5: Ready for release**

Feature complete! Market icon toggle ready for tomorrow's release.

---

## Success Criteria

✅ Market icon appears in header by default
✅ Clicking Market opens Settings → Market tab
✅ Settings panel has 3-column compact layout
✅ All 5 header buttons default to ON for new users
✅ Toggle controls work for all buttons
✅ Responsive grid works on mobile/tablet
✅ Existing user preferences preserved
✅ No console errors or visual regressions

---

## Notes for Implementer

**Follow existing patterns:**
- Header buttons use `safeGetElement()` and `safeAttachListener()`
- localStorage uses string "true"/"false" (not boolean)
- Default visibility uses `!== "false"` pattern (defaults to true)
- All event listeners use descriptive labels

**Key files to reference:**
- `js/settings-listeners.js` (lines 131-162) - existing header button handlers
- `js/settings.js` (line 1080+) - existing visibility logic
- `index.html` (lines 372-414) - existing header button HTML

**Testing tips:**
- Use `localStorage.clear()` to test fresh install
- Use DevTools → Application → localStorage to inspect keys
- Use responsive mode to test grid breakpoints
- Check both light and dark themes

**Common gotchas:**
- Don't forget to add key to ALLOWED_STORAGE_KEYS
- Match exact spacing/indentation in HTML
- Use `safeGetElement()` not `getElementById()`
- Settings tab selector might be `[data-settings-tab="market"]` or similar - verify actual attribute name
