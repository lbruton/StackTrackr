# API Health Badge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a client-side API health status badge to the footer and About modal that fetches `manifest.json` and shows ✅/❌ staleness status, with a detail modal on click.

**Architecture:** A new `js/api-health.js` module fetches `manifest.json` from `RETAIL_API_BASE_URL` on `DOMContentLoaded`, computes data age, and updates two badge elements (`#apiHealthBadge` in footer, `#apiHealthBadgeAbout` in About modal). Both badges open `#apiHealthModal` which shows generated_at, age in minutes, coin count, and a staleness verdict. The feature is purely client-side — no server required — making it Cloudflare Pages compatible.

**Tech Stack:** Vanilla JS, `fetch()`, CSS classes already in project (`.about-badge`, `.version-badge`), modal system (`openModalById`/`closeModalById`).

**File Touch Map:**

| Action | File | Scope |
|--------|------|-------|
| CREATE | `js/api-health.js` | new module (~100 lines) |
| MODIFY | `index.html` | footer: add health badge; About modal badges: add health badge; after `</footer>`: add `#apiHealthModal` HTML; script list: add `api-health.js` after `about.js` |
| MODIFY | `sw.js` | CORE_ASSETS: add `./js/api-health.js` after `./js/about.js` |
| MODIFY | `js/constants.js` | line 289: bump `APP_VERSION` from `"3.32.05"` → `"3.32.06"` |
| MODIFY | `version.json` | bump version to `"3.32.06"` |
| MODIFY | `docs/announcements.md` | prepend new What's New bullet for v3.32.06 |

---

## Task Table

| ID | Step | Est (min) | Files/Modules | Validation | Risk/Notes | Recommended Agent |
|----|------|-----------|---------------|------------|------------|-------------------|
| T1 | Create `js/api-health.js` | 8 | `js/api-health.js` | File exists, passes manual review | Must use `RETAIL_API_BASE_URL` global, not hardcode URL | Claude ← NEXT |
| T2 | Add `#apiHealthModal` HTML to `index.html` | 5 | `index.html` | Modal visible in DOM; no broken HTML | Follow `.modal` → `.modal-content` → `.modal-header` → `.modal-body` structure |  Claude |
| T3 | Add health badges to footer and About modal in `index.html` | 5 | `index.html` | Badges render correctly; click triggers modal | Two elements: `#apiHealthBadge` (footer) and `#apiHealthBadgeAbout` (About badges row) | Claude |
| T4 | Wire `api-health.js` into `index.html` script list and `sw.js` CORE_ASSETS | 3 | `index.html`, `sw.js` | Script loads; no 404 in browser devtools | Must be after `about.js` in both files | Claude |
| T5 | Bump version to `3.32.06` | 3 | `js/constants.js`, `version.json`, `docs/announcements.md` | `APP_VERSION === "3.32.06"` in console; about modal shows v3.32.06 | Touch all 3 version files atomically | Claude |
| T6 | Commit | 1 | — | `git log` shows commit | — | Claude |

---

### Task T1: Create `js/api-health.js` ← NEXT

**Files:**
- Create: `js/api-health.js`

**Context:**
- `RETAIL_API_BASE_URL` is a global constant (`"https://api.staktrakr.com/data/api"`) defined in `js/constants.js` and exposed on `window.RETAIL_API_BASE_URL`
- `openModalById` / `closeModalById` are global functions from the modal system
- `safeGetElement(id)` is the safe DOM accessor (from `js/utils.js`) — use this, never raw `document.getElementById` (exception: `init.js` and `about.js` startup)
- Staleness threshold: **300 minutes** (5 hours) — matches the GitHub Action's `STALE_SECONDS=18000`

**Step 1: Write the module**

Create `js/api-health.js` with the following complete implementation:

```javascript
// API HEALTH CHECK
// =============================================================================

const API_HEALTH_STALE_MINUTES = 300; // 5 hours — matches GitHub Action STALE_SECONDS

/**
 * Fetches manifest.json and returns parsed health data.
 * @returns {Promise<{generatedAt: Date, ageMinutes: number, coins: string[], isStale: boolean}>}
 */
const fetchApiHealth = async () => {
  const base = (typeof RETAIL_API_BASE_URL !== "undefined")
    ? RETAIL_API_BASE_URL
    : "https://api.staktrakr.com/data/api";
  const res = await fetch(`${base}/manifest.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const generatedAt = new Date(data.generated_at);
  const ageMinutes = Math.floor((Date.now() - generatedAt.getTime()) / 60000);
  return {
    generatedAt,
    ageMinutes,
    coins: data.coins || [],
    isStale: ageMinutes > API_HEALTH_STALE_MINUTES,
  };
};

/**
 * Updates both health badge elements with current status.
 * @param {{isStale: boolean, ageMinutes: number}} health
 */
const updateHealthBadges = (health) => {
  const label = health.isStale
    ? `❌ API ${health.ageMinutes}m old`
    : `✅ API ${health.ageMinutes}m old`;
  ["apiHealthBadge", "apiHealthBadgeAbout"].forEach((id) => {
    const el = safeGetElement(id);
    if (el) el.textContent = label;
  });
};

/**
 * Populates the health detail modal with fetched data.
 * @param {{generatedAt: Date, ageMinutes: number, coins: string[], isStale: boolean}} health
 */
const populateApiHealthModal = (health) => {
  const statusEl = safeGetElement("apiHealthStatus");
  const generatedEl = safeGetElement("apiHealthGeneratedAt");
  const ageEl = safeGetElement("apiHealthAge");
  const coinsEl = safeGetElement("apiHealthCoins");
  const verdictEl = safeGetElement("apiHealthVerdict");

  if (statusEl) statusEl.textContent = health.isStale ? "❌ Stale" : "✅ Fresh";
  if (generatedEl) generatedEl.textContent = health.generatedAt.toLocaleString();
  if (ageEl) ageEl.textContent = `${health.ageMinutes} min`;
  if (coinsEl) coinsEl.textContent = `${health.coins.length} coins tracked`;
  if (verdictEl) {
    verdictEl.textContent = health.isStale
      ? `Data is over ${API_HEALTH_STALE_MINUTES} minutes old — poller may be down.`
      : `Data is current. Poller is healthy.`;
  }
};

/**
 * Populates the health detail modal with an error state.
 * @param {Error} err
 */
const populateApiHealthModalError = (err) => {
  const statusEl = safeGetElement("apiHealthStatus");
  const verdictEl = safeGetElement("apiHealthVerdict");
  if (statusEl) statusEl.textContent = "❌ Unreachable";
  if (verdictEl) verdictEl.textContent = `Could not reach API: ${err.message}`;
  ["apiHealthBadge", "apiHealthBadgeAbout"].forEach((id) => {
    const el = safeGetElement(id);
    if (el) el.textContent = "❌ API ?";
  });
};

// Cached result so the modal reflects the same data as the badge
let _lastHealth = null;

/**
 * Opens the API health modal, populating it if data already loaded.
 */
const showApiHealthModal = () => {
  if (_lastHealth) populateApiHealthModal(_lastHealth);
  if (window.openModalById) openModalById("apiHealthModal");
};

/**
 * Hides the API health modal.
 */
const hideApiHealthModal = () => {
  if (window.closeModalById) closeModalById("apiHealthModal");
};

/**
 * Sets up event listeners for the health modal.
 */
const setupApiHealthModalEvents = () => {
  const closeBtn = safeGetElement("apiHealthCloseBtn");
  const modal = safeGetElement("apiHealthModal");
  if (closeBtn) closeBtn.addEventListener("click", hideApiHealthModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hideApiHealthModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.style.display === "flex") {
      hideApiHealthModal();
    }
  });
};

/**
 * Main entry point — fetches health data and wires up the UI.
 */
const initApiHealth = async () => {
  setupApiHealthModalEvents();
  try {
    const health = await fetchApiHealth();
    _lastHealth = health;
    updateHealthBadges(health);
  } catch (err) {
    console.warn("API health check failed:", err);
    populateApiHealthModalError(err);
  }
};

// Expose globally for other modules and onclick handlers
if (typeof window !== "undefined") {
  window.showApiHealthModal = showApiHealthModal;
  window.hideApiHealthModal = hideApiHealthModal;
  window.initApiHealth = initApiHealth;
}

document.addEventListener("DOMContentLoaded", initApiHealth);
```

**Step 2: Verify the file was created**

```bash
wc -l js/api-health.js
```

Expected: ~110 lines.

---

### Task T2: Add `#apiHealthModal` HTML to `index.html`

**Files:**
- Modify: `index.html` — insert after the closing `</footer>` tag (around line 1815)

**Context:**
- The `</footer>` closes at approximately line 1813. The `<!-- ABOUT & DISCLAIMER MODAL -->` comment block follows.
- Insert the new modal HTML between `</footer>` and the `<!-- ABOUT & DISCLAIMER MODAL -->` comment.
- Follow the existing `privacyModal` pattern (line 4610): `<div class="modal" ...>` → `<div class="modal-content">` → `<div class="modal-header">` → `<div class="modal-body">`

**Step 1: Locate the insertion point**

```bash
grep -n "</footer>" index.html
```

Expected: one result at approximately line 1813.

**Step 2: Insert the modal HTML**

Insert the following HTML block immediately after `</footer>`:

```html
    <!-- =============================================================================
       API HEALTH MODAL
       Shows manifest.json staleness status, generated_at timestamp, and coin count.
       ============================================================================= -->
    <div class="modal" id="apiHealthModal" style="display: none">
      <div class="modal-content" style="max-width:480px">
        <div class="modal-header">
          <h3>API Health Status</h3>
          <button aria-label="Close modal" class="modal-close" id="apiHealthCloseBtn">&times;</button>
        </div>
        <div class="modal-body" style="padding:1rem 1.5rem">
          <div class="about-section">
            <div class="section-title">Status: <span id="apiHealthStatus">Checking…</span></div>
            <table style="width:100%;font-size:0.9rem;border-collapse:collapse;margin-top:0.5rem">
              <tr><td style="padding:0.3rem 0;color:var(--text-muted)">Last updated</td><td id="apiHealthGeneratedAt" style="text-align:right">—</td></tr>
              <tr><td style="padding:0.3rem 0;color:var(--text-muted)">Data age</td><td id="apiHealthAge" style="text-align:right">—</td></tr>
              <tr><td style="padding:0.3rem 0;color:var(--text-muted)">Coverage</td><td id="apiHealthCoins" style="text-align:right">—</td></tr>
            </table>
          </div>
          <div class="about-alert about-alert-compact" style="margin-top:1rem">
            <span id="apiHealthVerdict">Fetching status…</span>
          </div>
        </div>
      </div>
    </div>
```

**Step 3: Verify no broken HTML**

```bash
grep -c "apiHealthModal\|apiHealthStatus\|apiHealthVerdict" index.html
```

Expected: 3 (one each for the three IDs).

---

### Task T3: Add health badges to footer and About modal

**Files:**
- Modify: `index.html` — two separate insertions

**Context:**
- **Footer badge** (`#apiHealthBadge`): Goes at end of the footer text `<span>`, after the FAQ link. The span ends with `FAQ</a></span>` at approximately line 1801. Add a `·` separator and the badge button after the FAQ `</a>` and before `</span>`.
- **About modal badge** (`#apiHealthBadgeAbout`): Goes inside the `.about-badges` div (line ~1907), after the existing `🔒 Privacy` button (line ~1935), as a new `<button class="about-badge">` element.

**Step 1: Add footer badge**

Locate this exact text in `index.html` (line ~1801):

```
onclick="if(window.showFaqModal){event.preventDefault();window.showFaqModal();}">FAQ</a></span>
```

Replace with:

```
onclick="if(window.showFaqModal){event.preventDefault();window.showFaqModal();}">FAQ</a> &middot; <button class="version-badge" id="apiHealthBadge" onclick="if(window.showApiHealthModal)window.showApiHealthModal()" style="cursor:pointer;border:none;background:none;padding:0;font:inherit">Checking API…</button></span>
```

**Step 2: Add About modal badge**

Locate this exact text in `index.html` (line ~1935):

```html
              <button class="about-badge" onclick="if(window.openModalById)openModalById('privacyModal')">
                🔒 Privacy
              </button>
```

Insert after that closing `</button>`:

```html
              <button class="about-badge" id="apiHealthBadgeAbout" onclick="if(window.showApiHealthModal)window.showApiHealthModal()">
                📡 API Health
              </button>
```

**Step 3: Verify both elements exist**

```bash
grep -n "apiHealthBadge\|apiHealthBadgeAbout" index.html
```

Expected: 2 results.

---

### Task T4: Wire `api-health.js` into script list and `sw.js`

**Files:**
- Modify: `index.html` — script list (line ~4790)
- Modify: `sw.js` — CORE_ASSETS (line ~68)

**Context:**
- In `index.html`, `about.js` is at line 4790, `faq.js` at 4791. Insert `api-health.js` between them.
- In `sw.js`, `'./js/about.js'` is at approximately line 68, `'./js/faq.js'` at line 69. Insert between them.

**Step 1: Add script tag to `index.html`**

Locate:
```html
    <script defer src="./js/about.js"></script>
    <script defer src="./js/faq.js"></script>
```

Replace with:
```html
    <script defer src="./js/about.js"></script>
    <script defer src="./js/api-health.js"></script>
    <script defer src="./js/faq.js"></script>
```

**Step 2: Add to `sw.js` CORE_ASSETS**

Locate:
```javascript
  './js/about.js',
  './js/faq.js',
```

Replace with:
```javascript
  './js/about.js',
  './js/api-health.js',
  './js/faq.js',
```

**Step 3: Verify both insertions**

```bash
grep -n "api-health" index.html sw.js
```

Expected: 2 results (one in each file).

---

### Task T5: Bump version to `3.32.06`

**Files:**
- Modify: `js/constants.js` line 289
- Modify: `version.json`
- Modify: `docs/announcements.md` — prepend new bullet

**Context:**
- Current version is `3.32.05` across all three files. Bump to `3.32.06`.
- `about.js`'s embedded `getEmbeddedWhatsNew()` (line ~285-292) also contains the version history — prepend a new `<li>` there too.

**Step 1: Bump `js/constants.js`**

Line 289 — change:
```javascript
const APP_VERSION = "3.32.05";
```
To:
```javascript
const APP_VERSION = "3.32.06";
```

**Step 2: Bump `version.json`**

Change:
```json
{
  "version": "3.32.05",
  "releaseDate": "2026-02-22",
  "releaseUrl": "https://github.com/lbruton/StakTrakr/releases/latest"
}
```
To:
```json
{
  "version": "3.32.06",
  "releaseDate": "2026-02-22",
  "releaseUrl": "https://github.com/lbruton/StakTrakr/releases/latest"
}
```

**Step 3: Prepend to `docs/announcements.md` What's New section**

The first bullet currently starts with `- **Service Worker Cache Coverage (v3.32.05)**`. Prepend a new bullet above it:

```markdown
- **API Health Badge (v3.32.06)**: Footer and About modal now show live API data freshness status — click the badge for details on last update time and coin coverage
```

**Step 4: Prepend to `js/about.js` `getEmbeddedWhatsNew()` (line ~285)**

The function returns a template literal. Prepend a new `<li>` before the existing first `<li>`:

```html
    <li><strong>v3.32.06 &ndash; API Health Badge</strong>: Footer and About modal now show live API data freshness status &mdash; click the badge for details on last update time and coin coverage</li>
```

**Step 5: Verify consistency**

```bash
grep -r "3\.32\.0[56]" js/constants.js version.json docs/announcements.md js/about.js
```

Expected: `3.32.06` in all four files, `3.32.05` only in historical entries in announcements.md and about.js.

---

### Task T6: Commit

**Files:** All modified files.

**Step 1: Stage and commit**

```bash
git add js/api-health.js index.html sw.js js/constants.js version.json docs/announcements.md js/about.js
git status
```

Verify only the expected files are staged. Then:

```bash
git commit -m "$(cat <<'EOF'
feat(api-health): add API health badge to footer and About modal (v3.32.06)

Footer and About modal now show live data freshness status via manifest.json
fetch. Clicking the badge opens a detail modal with generated_at timestamp,
data age, and coin coverage count. Uses 5-hour staleness threshold matching
the GitHub Action poller watchdog.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 2: Verify**

```bash
git log --oneline -3
```

Expected: the new commit appears at top.

---

## Auto-Quiz

1. **Which task is NEXT?** T1 — Create `js/api-health.js`
2. **Validation for NEXT?** Run `wc -l js/api-health.js` — expected: ~110 lines. Then visually confirm the `fetchApiHealth`, `updateHealthBadges`, `populateApiHealthModal`, and `initApiHealth` functions are present.
3. **Commit message for NEXT?** No commit at T1 — the full commit is at T6 after all five changes are bundled.
4. **Breakpoint?** After T3 (badges in place), pause and ask the user to open the app in a browser, verify the badge renders in the footer and About modal, and confirm the modal opens correctly before wiring the script tag and committing.
