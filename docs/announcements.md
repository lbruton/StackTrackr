## What's New

- **WeakMap Search Cache Correctness (v3.32.09)**: Cache miss guard uses strict undefined check; notes edits invalidate search cache immediately; undo/redo now reflects reverted field values in search
- **OAuth State Security Hardening (v3.32.08)**: Provider now parsed from trusted savedState after CSRF check; PKCE challenge adds .catch() to clean sessionStorage on failure; stale oauth state removed on exchange failure
- **Backend Data Integrity & Sparkline Fix (v3.32.07)**: Sync restore clears scoped keys before writing; DiffEngine module added for inventory merge; vault manifest AES-256-GCM crypto; sparkline spikes fixed via intraday dedup and ±1% Y-axis normalization (STAK-183, STAK-186, STAK-187, STAK-188)
- **API Health Badge (v3.32.06)**: Footer and About modal now show live API data freshness status — click the badge for details on last update time and coin coverage
- **Service Worker Cache Coverage (v3.32.05)**: image-processor.js, bulk-image-cache.js, and image-cache-modal.js added to sw.js CORE_ASSETS — offline image workflows no longer 404 on first offline visit
- **Async Save Reliability (v3.32.04)**: Storage calls in spot price sync, catalog manager, and inventory save now properly await saveData() — prevents silently dropped errors if localStorage throws

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides
