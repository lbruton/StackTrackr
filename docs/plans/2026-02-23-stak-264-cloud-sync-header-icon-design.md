# STAK-264: Cloud Sync Header Icon — Design

**Date:** 2026-02-23
**Issue:** [STAK-264](https://linear.app/hextrackr/issue/STAK-264/login-on-first-load-is-jarring-to-many-users)
**Status:** Approved

## Problem

When cloud sync is enabled and the vault password has expired (cleared from sessionStorage),
the app immediately opens a password modal on first load — before the user has oriented
themselves. This is jarring, especially when a version/ack modal may also be showing.

## Solution: Approach A — Suppress modal + add header icon

Add a `#headerCloudSyncBtn` to the header that provides ambient sync status and a
deliberate entry point for re-entering the vault password. Suppress the automatic
on-load password modal; replace with a brief toast nudge.

---

## Architecture

Three touch points only — no new files:

| Concern | File | Change |
|---|---|---|
| Header icon HTML | `index.html` | Add `#headerCloudSyncBtn` between About and Settings |
| Icon state + on-load behavior | `js/cloud-sync.js` | New `updateCloudSyncHeaderBtn()`, modify startup path |
| Icon styles | `styles.css` | Three color states + hover, reuse `header-toggle-btn` |

---

## Components & Data Flow

### Header button (`#headerCloudSyncBtn`)

- Classes: `btn theme-btn header-toggle-btn` — identical to all existing header icons
- SVG: cloud icon with a small colored dot overlay (mirrors `cloud-sync-dot` pattern)
- Hidden (`display:none`) when `cloud_sync_enabled === 'false'`; visible otherwise

### State derivation (in priority order)

```
syncIsEnabled() === false           → hide button
cloudGetCachedPassword() !== null   → green  (password cached, syncing normally)
cloudIsConnected()      === true    → orange (connected but password expired)
else                                → gray   (sync on, not yet connected/configured)
```

### On-load path (modification to `initCloudSync()`)

1. Detect: sync enabled but no cached password → set `_syncNeedsPasswordOnLoad = true`
2. Skip `pushSyncVault()` on startup; guard the 3-second `pollForRemoteChanges()` call
3. Call `updateCloudSyncHeaderBtn()` → icon renders orange
4. Show `showCloudToast('Cloud sync needs your password — tap the sync icon to unlock', 5000)`

### Click handlers

| State | Action |
|---|---|
| Gray | `openSettingsToTab('cloud')` |
| Orange | Open `cloudSyncPasswordModal`; on confirm → clear flag → call `pushSyncVault()` |
| Green | `showCloudToast('Synced ' + lastSyncRelativeTime, 2500)` |

### `updateCloudSyncHeaderBtn()`

Called at every site where `updateSyncStatusIndicator()` is already called — ensuring the
header icon always mirrors the settings panel dot with no extra wiring.

---

## Edge Cases

| Case | Behavior |
|---|---|
| Idle timeout clears password | `updateSyncStatusIndicator()` already calls our hook → green → orange |
| Modal already open when icon clicked | Existing modal manager handles stacking safely |
| Password cancelled from icon | Flag stays set, icon stays orange, push skipped |
| `disableCloudSync()` called | `updateSyncStatusIndicator('disabled')` → button hides instantly |
| First-time user (gray) | Clicking opens Cloud settings tab — natural onboarding path |
| Multiple tabs | sessionStorage is tab-scoped; each tab manages its own state independently |

---

## Testing Checklist

| Scenario | Expected |
|---|---|
| Sync disabled → load page | Button hidden |
| Sync enabled, fresh session (no cached pw) → load | Button orange + toast appears |
| Click orange → enter password → confirm | Password cached, push fires, icon turns green |
| Click orange → cancel | Icon stays orange, no push |
| Idle timeout fires | Icon transitions green → orange silently |
| Click green icon | Toast shows "Synced X ago" |
| Click gray icon | Opens Settings → Cloud tab |
| Disable sync in settings | Button immediately hides |
| Re-enable sync in settings | Button reappears in correct state |
| Two tabs open, password entered in tab 1 | Tab 2 stays orange (correct — sessionStorage is tab-scoped) |

---

## Future: API Sync Icon (next session)

This pattern is designed to be mirrored for the API sync status button. The same
state-derivation → header icon → toast nudge flow applies. STAK-264 establishes
the foundation.
