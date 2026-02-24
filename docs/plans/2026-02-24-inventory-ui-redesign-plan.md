# Inventory Settings UI Redesign + Cloud Consolidation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the plain settings-fieldset/settings-card layout in the Inventory Settings panel with cloud-provider-card aesthetics, add an Inventory Summary card alongside Bulk Editor, and consolidate Cloud Sync into the Inventory Settings panel (hiding the Cloud nav tab when fewer than 2 providers are connected).

**Architecture:** Pure HTML restructuring in `index.html` — no new JS files, no new CSS classes. All existing button IDs and event handlers are preserved verbatim. A small JS addition to `settings.js` handles the Cloud nav item visibility check. The Dropbox `cloud-provider-card` block is relocated from `#settingsPanel_cloud` (lines 3026–3192) into `#settingsPanel_system` (currently ends at line 3431), and `#settingsPanel_cloud` is deleted entirely.

**Tech Stack:** Vanilla HTML/CSS, existing `cloud-provider-card` CSS classes, `loadDataSync()` from `js/utils.js`, `cloudIsConnected()` from `js/cloud-storage.js`, `formatCurrency()` from `js/utils.js`.

---

## Key File References

- **`index.html`** — All HTML changes. Inventory panel: lines 3332–3431. Cloud panel: lines 3026–3192. Cloud nav item: line 2138.
- **`js/settings.js`** — `switchSettingsSection()` function: lines 40–95. Add cloud nav hide logic here.
- **Globals available at settings init time:**
  - `loadDataSync(LS_KEY, [])` — synchronous read of inventory items array (key: `"metalInventory"`)
  - `cloudIsConnected(provider)` — checks localStorage token for provider key (defined in `cloud-storage.js`, exposed as `window.cloudIsConnected`)
  - `CLOUD_PROVIDERS` — object with provider keys: `{ dropbox, pcloud, ... }` (defined in `cloud-storage.js`)
  - `formatCurrency(value)` — formats a number as currency string

---

## Task 1: Replace Bulk Editor section with 2-column cloud-provider-card layout

**Files:**
- Modify: `index.html:3335–3353` (the Bulk Editor `settings-fieldset`)

**What to do:**

Replace the entire Bulk Editor `settings-fieldset` block (from `<div class="settings-fieldset">` containing `settings-fieldset-title` "Bulk Editor" through its closing `</div>`) with a `settings-card-grid` of two `cloud-provider-card` elements: one for Bulk Editor, one for Inventory Summary.

**New HTML to write (replaces lines 3335–3353):**

```html
<!-- ── Bulk Editor + Inventory Summary ── -->
<div class="settings-card-grid" style="margin-bottom:1rem">
  <div class="cloud-provider-card">
    <div class="cloud-provider-card-header">
      <span class="cloud-provider-card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Bulk Editor
      </span>
      <span class="cloud-provider-card-badges">
        <span class="cloud-badge cloud-badge--beta">BETA</span>
      </span>
    </div>
    <p class="settings-subtext">Select multiple inventory items and apply batch operations — edit shared fields, duplicate entries, or remove items in bulk. This feature is actively developed; please report any issues on GitHub.</p>
    <div style="border-top:1px solid var(--border);padding-top:0.6rem;margin-top:0.5rem">
      <button class="btn settings-action-btn" id="bulkEditBtn" type="button" style="font-size:0.82rem;padding:0.4rem 0.9rem;min-height:0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.35rem;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Open Bulk Editor
      </button>
    </div>
  </div>
  <div class="cloud-provider-card" id="inventorySummaryCard">
    <div class="cloud-provider-card-header">
      <span class="cloud-provider-card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Inventory
      </span>
    </div>
    <div class="cloud-connection-status" id="inventorySummaryRows">
      <div class="cloud-status-row">
        <span class="cloud-status-label">Items</span>
        <span class="cloud-status-value" id="invSummaryCount">—</span>
      </div>
      <div class="cloud-status-row">
        <span class="cloud-status-label">Melt value</span>
        <span class="cloud-status-value" id="invSummaryMelt">—</span>
      </div>
      <div class="cloud-status-row">
        <span class="cloud-status-label">Last modified</span>
        <span class="cloud-status-value" id="invSummaryModified">—</span>
      </div>
    </div>
  </div>
</div>
```

**Step 1:** Open `index.html`, locate line 3335 (the `<!-- ── Bulk Editor ──` comment inside `#settingsPanel_system`).

**Step 2:** Select from that comment through the closing `</div>` of the fieldset (line 3353 — the `</div>` that closes the outer `settings-fieldset`).

**Step 3:** Replace with the new HTML above.

**Step 4:** Verify in browser (open `index.html` in Chrome via `file://`, open Settings → Inventory): two cards appear side-by-side where the single Bulk Editor card was. The Inventory card shows dashes for all values (JS not wired yet).

**Step 5:** Commit:
```bash
cd .claude/worktrees/design-317-318
git add index.html
git commit -m "feat: Bulk Editor + Inventory Summary cards — cloud-provider-card layout (STAK-318)"
```

---

## Task 2: Replace Import section with 2-column cloud-provider-card layout

**Files:**
- Modify: `index.html:3355–3401` (the Import `settings-fieldset`)

**What to do:**

Replace the entire Import `settings-fieldset` block with a `settings-card-grid` of two `cloud-provider-card` elements: Import and Third-Party.

**New HTML (replaces lines 3355–3401):**

```html
<!-- ── Import + Third-Party ── -->
<div class="settings-card-grid" style="margin-bottom:1rem">
  <div class="cloud-provider-card">
    <div class="cloud-provider-card-header">
      <span class="cloud-provider-card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Import
      </span>
    </div>
    <p class="settings-subtext">Import your data files. New here? <a href="sample.csv" download="sample.csv">Download sample CSV</a> to try importing.</p>
    <div style="border-top:1px solid var(--border);padding-top:0.6rem;margin-top:0.5rem">
      <div class="import-block">
        <div class="import-export-grid">
          <div class="import-csv-grid">
            <button class="btn warning" id="importCsvOverride">Import CSV</button>
            <button class="btn success" id="importCsvMerge">Merge CSV</button>
            <input accept=".csv" hidden id="importCsvFile" type="file" />
          </div>
          <div class="import-json-grid">
            <button class="btn warning" id="importJsonOverride">Import JSON</button>
            <button class="btn success" id="importJsonMerge">Merge JSON</button>
            <input accept=".json" hidden id="importJsonFile" type="file" />
          </div>
          <div>
            <button class="btn warning" id="importZipBtn">Restore ZIP Backup</button>
            <input accept=".zip" hidden id="importZipFile" type="file" />
          </div>
        </div>
        <progress class="import-progress" id="importProgress" value="0" max="0"></progress>
        <div class="import-progress-text" id="importProgressText"></div>
      </div>
    </div>
  </div>
  <div class="cloud-provider-card">
    <div class="cloud-provider-card-header">
      <span class="cloud-provider-card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Third-Party
      </span>
    </div>
    <p class="settings-subtext">Import data from external services like Numista.</p>
    <div style="border-top:1px solid var(--border);padding-top:0.6rem;margin-top:0.5rem">
      <div class="third-party-block">
        <div class="import-export-grid">
          <div class="grid grid-2">
            <button class="btn warning" id="importNumistaBtn">Import Numista CSV</button>
            <button class="btn success" id="mergeNumistaBtn">Merge Numista CSV</button>
          </div>
          <input type="file" id="numistaImportFile" accept=".csv" hidden />
          <div class="beta-warning">Numista import is a beta feature</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Step 1:** Locate the Import `settings-fieldset` (starts with `<!-- ── Import ──` around line 3355).

**Step 2:** Replace the entire block through its closing `</div>` with the new HTML above.

**Step 3:** Verify: Import and Third-Party cards appear side-by-side. All buttons function as before.

**Step 4:** Commit:
```bash
git add index.html
git commit -m "feat: Import + Third-Party cards — cloud-provider-card layout (STAK-318)"
```

---

## Task 3: Replace Export section with 2-column cloud-provider-card layout

**Files:**
- Modify: `index.html:3403–3429` (the Export `settings-fieldset`)

**What to do:**

Replace the entire Export `settings-fieldset` with two `cloud-provider-card` elements: Export and Encrypted Backup.

**New HTML (replaces lines 3403–3429):**

```html
<!-- ── Export + Encrypted Backup ── -->
<div class="settings-card-grid" style="margin-bottom:1rem">
  <div class="cloud-provider-card">
    <div class="cloud-provider-card-header">
      <span class="cloud-provider-card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Export
      </span>
    </div>
    <p class="settings-subtext">Export your data files.</p>
    <div style="border-top:1px solid var(--border);padding-top:0.6rem;margin-top:0.5rem">
      <div class="export-block">
        <div class="import-export-grid">
          <button class="btn info" id="exportCsvBtn">Export CSV</button>
          <button class="btn info" id="exportJsonBtn">Export JSON</button>
          <button class="btn info" id="exportPdfBtn">Export PDF</button>
          <button class="btn info" id="exportZipBtn">Export ZIP Backup</button>
        </div>
      </div>
    </div>
  </div>
  <div class="cloud-provider-card">
    <div class="cloud-provider-card-header">
      <span class="cloud-provider-card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Encrypted Backup
      </span>
    </div>
    <p class="settings-subtext">AES-GCM encrypted vault file. Use to back up and restore all inventory data.</p>
    <div style="border-top:1px solid var(--border);padding-top:0.6rem;margin-top:0.5rem">
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
        <button class="btn" id="vaultExportBtn" style="font-size:0.82rem;padding:0.4rem 0.9rem;min-height:0">Export Backup</button>
        <button class="btn info" id="vaultImportBtn" style="font-size:0.82rem;padding:0.4rem 0.9rem;min-height:0">Restore Backup</button>
      </div>
      <input type="file" id="vaultImportFile" accept=".stvault" hidden />
    </div>
  </div>
</div>
```

**Step 1:** Locate the Export `settings-fieldset` (starts `<!-- ── Export ──` around line 3403).

**Step 2:** Replace the entire block through its closing `</div>` with the new HTML above.

**Step 3:** Verify: Export and Encrypted Backup cards appear side-by-side. Export/Restore buttons function as before.

**Step 4:** Commit:
```bash
git add index.html
git commit -m "feat: Export + Encrypted Backup cards — cloud-provider-card layout (STAK-318)"
```

---

## Task 4: Add Cloud Backup section to Inventory Settings panel (STAK-317)

**Files:**
- Modify: `index.html` — add Cloud section at the end of `#settingsPanel_system` (before its closing `</div>`, currently line 3431), then delete `#settingsPanel_cloud` entirely (lines 3026–3192).

### Step 4a: Add Cloud section to `#settingsPanel_system`

Insert the following HTML **before** the closing `</div>` of `#settingsPanel_system` (currently the last `</div>` in the panel, around line 3431):

```html
<!-- ── Cloud Backup ── (shown only when a provider is connected, controlled by JS) -->
<div id="inventoryCloudSection" style="display:none">
  <div class="settings-card-grid" style="margin-bottom:1rem">

    <!-- Dropbox card — identical to original, max-width removed -->
    <div class="cloud-provider-card" id="cloudCard_dropbox">
      <div class="cloud-provider-card-header">
        <span class="cloud-provider-card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><path d="M6 2l6 3.6L6 9.2 0 5.6zm12 0l6 3.6-6 3.6-6-3.6zm-12 8l6 3.6-6 3.6-6-3.6zm12 0l6 3.6-6 3.6-6-3.6zM6 18.4l6-3.6 6 3.6-6 3.6z"/></svg>
          Dropbox
        </span>
        <span class="cloud-provider-card-badges">
          <span class="cloud-connected-badge" style="display:none">Connected</span>
          <span class="cloud-badge cloud-badge--beta">BETA</span>
        </span>
      </div>

      <!-- Connection status -->
      <div class="cloud-connection-status" id="cloudStatus_dropbox">
        <div class="cloud-status-row">
          <span class="cloud-status-label">Status</span>
          <span class="cloud-status-value cloud-status-indicator" data-state="disconnected">
            <span class="cloud-status-dot"></span>
            <span class="cloud-status-text">Not connected</span>
          </span>
        </div>
        <div class="cloud-status-row" id="cloudAutoSyncStatus" style="align-items:center">
          <span class="cloud-status-label">Sync</span>
          <span class="cloud-status-value" style="display:flex;align-items:center;gap:0.4rem">
            <span class="cloud-sync-dot"></span>
            <span class="cloud-sync-status-text">Auto-sync off</span>
          </span>
        </div>
        <div class="cloud-status-row" style="align-items:center">
          <span class="cloud-status-label">Last synced</span>
          <span class="cloud-status-value" id="cloudAutoSyncLastSync">Never</span>
        </div>
      </div>

      <!-- Connect / Backup / Restore row -->
      <div class="cloud-login-area" style="margin-top:0.5rem;display:flex;gap:0.4rem;flex-wrap:wrap">
        <button class="btn cloud-connect-btn" data-provider="dropbox" style="font-size:0.82rem;padding:0.4rem 0.9rem;min-height:0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Connect
        </button>
        <button class="btn success cloud-backup-btn" data-provider="dropbox" disabled style="font-size:0.82rem;padding:0.4rem 0.9rem;min-height:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Backup
        </button>
        <button class="btn cloud-restore-btn" data-provider="dropbox" disabled style="font-size:0.82rem;padding:0.4rem 0.9rem;min-height:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Restore
        </button>
      </div>

      <!-- Auto-sync toggle -->
      <div class="cloud-autosync-section" style="margin-top:0.6rem;border-top:1px solid var(--border);padding-top:0.6rem">
        <div class="cloud-status-row" style="align-items:center">
          <span class="cloud-status-label"><strong>Auto-sync</strong></span>
          <label class="settings-toggle-switch" style="margin-left:auto">
            <input type="checkbox" id="cloudAutoSyncToggle" onchange="if(this.checked){enableCloudSync('dropbox');}else{disableCloudSync();}">
            <span class="settings-toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Sync Now + Advanced -->
      <div style="display:flex;gap:0.5rem;margin-top:0.6rem;align-items:center">
        <button class="btn" id="cloudSyncNowBtn" disabled onclick="if(typeof pushSyncVault==='function')pushSyncVault();" style="font-size:0.8rem;padding:0.35rem 0.75rem;min-height:0;flex:1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:0.3rem"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Sync Now
        </button>
        <button class="btn" id="cloudSyncAdvancedBtn" onclick="if(typeof openModalById==='function')openModalById('cloudSyncAdvancedModal');" style="font-size:0.8rem;padding:0.35rem 0.75rem;min-height:0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:0.3rem"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          Advanced
        </button>
      </div>

      <div class="cloud-status-detail"></div>
      <div class="cloud-backup-list" id="cloudBackupList_dropbox" style="display:none"></div>
    </div>

    <!-- Here be dragons — beta info card -->
    <div class="cloud-provider-card">
      <div class="cloud-provider-card-header">
        <span class="cloud-provider-card-title">
          &#x1F409; Cloud Sync Beta
        </span>
        <span class="cloud-provider-card-badges">
          <span class="cloud-badge cloud-badge--beta">BETA</span>
        </span>
      </div>
      <p class="settings-subtext">Cloud Sync lets you store <strong>encrypted vault backups</strong> on your own cloud storage account. Your data is encrypted with AES-256-GCM before it leaves StakTrakr &mdash; your provider never sees the plaintext.</p>
      <p class="settings-subtext">This feature is in <strong>early beta</strong>. It works, but rough edges remain. We are a small team and your patience means a lot.</p>
      <div style="border-top:1px solid var(--border);padding-top:0.6rem;margin-top:0.5rem">
        <button class="resource-btn" style="font-size:0.8rem;padding:0.35rem 0.75rem" onclick="if(window.openModalById)openModalById('privacyModal')">&#x1F512; Privacy Policy</button>
      </div>
    </div>

  </div>
</div>
```

### Step 4b: Delete `#settingsPanel_cloud`

Remove the entire `<div class="settings-section-panel" id="settingsPanel_cloud" ...>` block (lines 3026–3192, inclusive of opening and closing tags).

### Step 4c: Verify

1. Open `index.html` in browser → Settings → Inventory. Cloud section is hidden (provider not connected in dev).
2. Settings → Cloud nav item still visible for now (JS not updated yet).
3. All Dropbox card buttons are present in the DOM (verify with DevTools).

**Step 4d:** Commit:
```bash
git add index.html
git commit -m "feat: Cloud Backup section in Inventory Settings, remove cloud panel (STAK-317)"
```

---

## Task 5: Wire Inventory Summary card with live data

**Files:**
- Modify: `js/settings.js` — inside `switchSettingsSection()` function, add a `system` case block (lines 40–95)

**What to do:**

Add a block to `switchSettingsSection()` that populates the Inventory Summary card when the user switches to the `system` (Inventory) section, and shows/hides the Cloud section based on provider connection state.

**Insert this block** immediately after the storage section block (after line 94, before the closing `};` of `switchSettingsSection`):

```javascript
  // Populate Inventory Summary card and show/hide cloud section when switching to Inventory
  if (targetName === 'system') {
    // Inventory Summary card
    const countEl = document.getElementById('invSummaryCount');
    const meltEl = document.getElementById('invSummaryMelt');
    const modEl = document.getElementById('invSummaryModified');
    if (countEl || meltEl || modEl) {
      try {
        const items = loadDataSync(LS_KEY, []);
        if (countEl) countEl.textContent = items.length + ' items';
        // Melt value — read from footer DOM (already computed by renderTable)
        const meltDom = document.querySelector('[data-totals="all"] .totals-value, #totalMeltValue, .totals-melt');
        if (meltEl) {
          meltEl.textContent = (meltDom && meltDom.textContent) ? meltDom.textContent.trim() : '—';
        }
        // Last modified — newest updatedAt across all items
        if (modEl) {
          const newest = items.reduce((max, it) => {
            const ts = it.updatedAt || it.dateAdded || 0;
            return ts > max ? ts : max;
          }, 0);
          modEl.textContent = newest
            ? new Date(newest).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : '—';
        }
      } catch (e) { /* ignore — summary is non-critical */ }
    }

    // Cloud section visibility — show only when at least one provider is connected
    const cloudSection = document.getElementById('inventoryCloudSection');
    if (cloudSection && typeof cloudIsConnected === 'function' && typeof CLOUD_PROVIDERS !== 'undefined') {
      const connected = Object.keys(CLOUD_PROVIDERS).some(p => cloudIsConnected(p));
      cloudSection.style.display = connected ? 'block' : 'none';
      // Also sync cloud UI if shown
      if (connected && typeof syncCloudUI === 'function') syncCloudUI();
    }
  }
```

**Important:** `LS_KEY` is defined in `constants.js` which loads before `settings.js` — it is available as a global. `loadDataSync` is exposed on `window` by `utils.js`.

**Step 1:** Open `js/settings.js`, locate the closing `};` of `switchSettingsSection` (around line 95).

**Step 2:** Insert the block above immediately before that closing `};`.

**Step 3:** Verify: Open Settings → Inventory. Summary card shows item count, melt value (or `—` if `renderTable` hasn't run), and last modified date. Cloud section hidden (no provider connected in local dev).

**Step 4:** Commit:
```bash
git add js/settings.js
git commit -m "feat: Inventory Summary card data + cloud section visibility (STAK-317)"
```

---

## Task 6: Hide Cloud nav item when fewer than 2 providers are configured

**Files:**
- Modify: `js/settings.js` — end of file, or in `showSettingsModal()` / `syncSettingsUI()` — whichever runs on modal open

**What to do:**

Find where `syncSettingsUI()` is defined in `settings.js` (called from `showSettingsModal` at line 12). Add the cloud nav hide check inside it (or at the end of the file in a DOMContentLoaded listener if `syncSettingsUI` is complex).

**Search for `syncSettingsUI` in `settings.js` and add to it:**

```javascript
  // Hide Cloud nav item if fewer than 2 providers are configured
  const cloudNavItem = document.querySelector('.settings-nav-item[data-section="cloud"]');
  if (cloudNavItem && typeof cloudIsConnected === 'function' && typeof CLOUD_PROVIDERS !== 'undefined') {
    const connectedCount = Object.keys(CLOUD_PROVIDERS).filter(p => cloudIsConnected(p)).length;
    cloudNavItem.style.display = connectedCount >= 2 ? '' : 'none';
  }
```

If `syncSettingsUI` doesn't exist or is very large, add this as a self-contained call at the bottom of the file:

```javascript
// Hide Cloud nav item on page load if fewer than 2 providers are connected
document.addEventListener('DOMContentLoaded', () => {
  const cloudNavItem = document.querySelector('.settings-nav-item[data-section="cloud"]');
  if (cloudNavItem && typeof cloudIsConnected === 'function' && typeof CLOUD_PROVIDERS !== 'undefined') {
    const connectedCount = Object.keys(CLOUD_PROVIDERS).filter(p => cloudIsConnected(p)).length;
    cloudNavItem.style.display = connectedCount >= 2 ? '' : 'none';
  }
});
```

**Step 1:** Find `syncSettingsUI` in `settings.js`. If it exists, add the block inside it. If not, add the `DOMContentLoaded` version at the end of the file.

**Step 2:** Verify: Open Settings modal. Cloud nav item is not visible in the sidebar.

**Step 3:** Verify defensive behavior: If `cloudIsConnected` or `CLOUD_PROVIDERS` is undefined for any reason, the nav item stays visible (fails open, not closed).

**Step 4:** Commit:
```bash
git add js/settings.js
git commit -m "feat: hide Cloud nav tab when fewer than 2 providers configured (STAK-317)"
```

---

## Task 7: Visual QA pass

**No code changes — verification only.**

Open `index.html` directly in Chrome via `file://` URL.

**Checklist:**
- [ ] Settings → Inventory: four card groups visible (Bulk Editor+Summary, Import+Third-Party, Export+Encrypted Backup, Cloud hidden)
- [ ] Cloud nav item not visible in sidebar
- [ ] Bulk Editor card: "Open Bulk Editor" button works, opens bulk editor
- [ ] Import card: CSV/JSON/ZIP buttons trigger file pickers correctly
- [ ] Third-Party card: Numista Import/Merge buttons trigger file picker
- [ ] Export card: CSV/JSON/PDF/ZIP buttons trigger downloads
- [ ] Encrypted Backup card: Export Backup downloads `.stvault`, Restore Backup triggers file picker
- [ ] Inventory Summary card: item count shows, last modified shows (or `—` if no items)
- [ ] Cards are 2-column on desktop, stacked single-column on mobile (resize to <600px)
- [ ] Settings → Cloud nav item: hidden (not just invisible — check DevTools `display:none`)
- [ ] Old Cloud panel (`#settingsPanel_cloud`): absent from DOM entirely

**If any button is broken:** Check DevTools console for errors. Most likely cause: a button ID was accidentally changed. Compare against the original IDs listed in the plan header.

**Step 1:** Run the full checklist above.

**Step 2:** If all pass, commit design worktree cleanup and proceed to `/start-patch` for the implementation patch.

---

## Post-Implementation: Version Bump

After all tasks pass QA:

1. Run `/start-patch` → select STAK-317 + STAK-318
2. The release skill will claim a version lock and create `patch/VERSION` worktree
3. Port all HTML/JS changes from `design/317-318-inventory-ui` into the patch worktree
4. Version bump → commit → push → draft PR to `dev`
5. Cloudflare preview URL → final QA → merge

**Do NOT commit version bump files (`js/constants.js`, `CHANGELOG.md`, etc.) in the design worktree.** Those belong in the patch worktree.
