# Reddit P2P Marketplace Module — Design Document

**Date:** 2026-02-20
**Status:** Approved — Future Sprint
**Linear:** To be assigned
**Scope:** r/pmsforsale Reddit dashboard module, marketplace vendor integration

---

## Problem Statement

Serious precious metals collectors actively monitor r/pmsforsale for peer-to-peer deals, often at prices well below retail. There is currently no way to browse these listings inside StakTrakr, compare them to spot prices, or see them alongside retail vendor pricing. Users must context-switch to Reddit and do mental math manually.

---

## Goals

- Surface current r/pmsforsale [WTS] listings in a dedicated StakTrakr dashboard module
- Filter and rank listings by user-defined keyword patterns (ASE, Maple, Morgan, etc.)
- Show computed premium over spot price for each listing
- Display seller reputation (trade flair) without requiring a Reddit account
- Integrate Reddit as a vendor source in the existing marketplace retail cards
- Require zero setup from the user — no API key, no OAuth

## Non-Goals

- Posting, commenting, or any write operations to Reddit
- Reddit account login or OAuth flow
- Backend scraping of Reddit for price aggregation (separate future work — natural extension of the retail poller)
- eBay integration (same future backend work)
- Price history tracking across Reddit listings over time (Phase 2)

---

## Design

### 1. Module Architecture

Reddit P2P follows the established StakTrakr module pattern:

- **Main dashboard section**: When enabled, a "Reddit P2P" section renders on the main page. User can reorder it relative to Spot, Retail, and other modules.
- **Settings tab**: A "Reddit P2P" tab appears in Settings for pattern configuration and poll settings. The tab is present whether the module is enabled or disabled, so users can configure before enabling.
- **Marketplace integration**: When enabled, Reddit appears as a vendor row in the existing marketplace retail cards (see Section 5).

No new module framework required — the existing toggle, sort order, and settings tab plumbing is reused.

---

### 2. Data Fetching

Reddit's public JSON API is used without authentication. No API key or user login required.

**Endpoints:**

| Endpoint | Purpose |
|---|---|
| `https://www.reddit.com/r/pmsforsale/new.json?limit=100` | Latest posts, paginated via `after` token |
| `https://www.reddit.com/r/pmsforsale/search.json?q={term}&restrict_sr=true&sort=new` | Item-specific search (used by marketplace deep links and the All tab search) |

**Polling:**

- Background poll on configurable interval (default 15 min) — same pattern as retail background sync
- Cached in localStorage under `REDDIT_PMS_CACHE_KEY`
- Cache includes: raw post array, last-fetch timestamp
- On module load: if cache is fresh (within interval), skip fetch and render from cache
- On poll failure (network/Reddit down): retain last cached results, show "Last updated X ago" indicator

**Flair filter at fetch time:**

Only posts with `link_flair_text` containing `WTS` (want to sell) are retained. `WTB` and `WTT` posts are discarded before caching — they never reach the display layer.

**Rate limits:**

Reddit allows ~60 unauthenticated requests/minute per IP. At a 15-minute default poll interval, we stay well within limits even with search calls layered on top.

**Seller reputation:**

Each post object includes `author_flair_text` at no extra cost (same API response). Values like `"47 Trades"`, `"100+ Trades"`, `"Verified Vendor"` are surfaced directly on cards.

---

### 3. Card Display & Views

Two views toggled by tabs at the top of the module section:

#### Filtered tab (default)

Shows only posts matching the user's keyword patterns. Sort: lowest premium over spot first, comment count as tiebreaker.

**Card fields:**

| Field | Source | Notes |
|---|---|---|
| Item name | Parsed from title | Best-effort, falls back to truncated raw title |
| Asking price | Extracted from title | Matches `$32.50`, `$32.50/oz`, `$325 OBO`, `325 shipped` patterns |
| Premium over spot | Computed: `(asking/oz − spot) / spot × 100` | Grayed out if metal type can't be determined |
| Seller + flair | `author` + `author_flair_text` | e.g. `u/seller · 47 Trades` |
| Post age | `created_utc` | Rendered as relative time: `2h ago`, `1d ago` |
| Comment count | `num_comments` | Indicates deal activity / claimed items |
| Click action | Opens `permalink` in new tab | — |

Posts where price extraction fails are hidden from the Filtered tab (not shown broken).

#### All tab

Same card format, no keyword filtering, sorted newest first. Includes a live search input that queries the search endpoint. Posts without an extractable price are shown but visually dimmed with no premium calculation.

#### Graceful degradation

- Network failure → render cached results with staleness indicator
- Reddit API error → show last cache, log to debugLog
- No cache yet → empty state with "Fetching listings…" message

---

### 4. Pattern Configuration (Settings Tab)

#### Keyword pattern list

Ships with a default set covering the most common r/pmsforsale items:

```
American Silver Eagle, ASE
Canadian Maple Leaf, Maple
Morgan Silver Dollar, Morgan
Peace Dollar
Junk Silver, 90%
Gold Eagle, AGE
Gold Buffalo
Krugerrand
Britannia
Silver Bar, Silver Round
Platinum
```

Each row is a comma-separated alias group — any alias in the group matches the same item. Users can add, edit, and delete rows. Stored in localStorage under `REDDIT_PMS_PATTERNS_KEY`. Included in ZIP backup automatically.

#### Custom pattern field

A plain textarea below the list, labeled "Advanced: custom match patterns (one per line, supports regex)." Collapsed by default behind a "Show advanced" toggle. Patterns here run after the keyword list — if either matches, the post is included. Intended for power users chasing specific items (seated liberties, specific mint marks, etc.).

#### Poll interval

Dropdown: 5 min / 15 min / 30 min / 1 hr. Default: 15 min.

#### Module toggle

On/off switch at the top of the tab. Standard module pattern.

---

### 5. Marketplace Vendor Integration

When the Reddit module is enabled, each marketplace retail card gains a Reddit vendor row:

- **Price shown**: Lowest current asking price in the cached listings that matched that item's keyword pattern
- **Badge**: Small Reddit logo beside the price to identify the source
- **Tooltip on hover**: Seller username, trade flair, post age
- **Click behavior**: Calls `search.json?q={item keyword}` and navigates to the Reddit module's Filtered tab pre-filtered to that item
- **No match**: Row shows `—` (not hidden) so user knows Reddit was checked
- **Module disabled**: Row does not appear in marketplace cards

---

### 6. Storage Keys

All keys registered in `ALLOWED_STORAGE_KEYS` in `js/constants.js` — automatically included in ZIP export/import.

| Key | Contents |
|---|---|
| `REDDIT_PMS_CACHE_KEY` | Cached WTS post array + last-fetch timestamp |
| `REDDIT_PMS_PATTERNS_KEY` | User keyword pattern groups (alias arrays) |
| `REDDIT_PMS_SETTINGS_KEY` | Poll interval, module enabled state |

---

## File Changes Summary

| File | Change |
|---|---|
| `js/constants.js` | Add 3 new storage keys to `ALLOWED_STORAGE_KEYS`, export on `window` |
| `js/reddit-pms.js` | New module: fetch, parse, cache, render cards, background poll |
| `js/settings.js` | Add Reddit P2P settings tab render |
| `js/settings-listeners.js` | Bind pattern list edit/add/delete, poll interval, module toggle |
| `js/retail.js` | Add Reddit vendor row to marketplace retail cards |
| `js/init.js` | Call `startRedditPmsBackgroundSync()` on startup if module enabled |
| `index.html` | Add `<script>` tag for `reddit-pms.js` in correct load order (after `retail.js`, before `api.js`) |
| `sw.js` | Add `reddit-pms.js` to `CORE_ASSETS` (pre-commit hook handles `CACHE_NAME` stamp) |

---

## Implementation Order

1. `constants.js` — storage keys
2. `reddit-pms.js` — fetch + parse + cache layer (no UI yet)
3. `reddit-pms.js` — card render + two-tab view
4. `js/init.js` + `index.html` + `sw.js` — wire up
5. `settings.js` + `settings-listeners.js` — settings tab UI
6. `retail.js` — marketplace vendor row integration
7. QA: verify no-auth fetch works, price extraction covers common title formats, marketplace row links correctly

---

## Open Questions / Future Work

- Reddit as a price source in the backend aggregation API (natural extension of current retail poller work — separate sprint)
- eBay sold-price integration (same backend sprint)
- Deal alerts: notify user when a new listing matches a pattern (requires polling to stay active — already built into the module)
- Price history chart for P2P listings over time (Phase 2, once backend scraping ships)
