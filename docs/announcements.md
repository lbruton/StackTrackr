## What's New

- **Numista Search Overhaul (v3.33.01)**: Per-field origin tracking with two-tier re-sync picker showing diff hints and smart defaults. Independent tag blacklist with Settings management. Auto-apply toggle for Numista tags. Backup export now preserves Numista data and field metadata (STAK-345, STAK-346, STAK-354, STAK-362, STAK-363)
- **Cloud Sync, Image Pipeline & Retail Charts (v3.33.00)**: Unified encryption for cloud sync with ambient status icons. Removed coinImages IDB cache — CDN-only Numista images. Dynamic IndexedDB quota. 24h retail intraday chart with anomaly filtering. Kilogram and pound weight units. Numista tags visible in edit modal and card view. Reorderable header buttons. Tabnabbing hardening across all external links
- **Retail Anomaly Filter (v3.32.45)**: Two-pass anomaly detection in 24h retail chart — temporal spike smoothing (±5% neighbor consensus) plus cross-vendor median safety net. Anomalous table cells shown with line-through styling (STAK-325)
- **Kilo & Pound Weight Units (v3.32.44)**: Added kilogram and pound to the weight unit dropdown. Melt values convert correctly. Table, cards, and modals all display in the chosen unit (STAK-338)
- **Numista Tag Fixes (v3.32.43)**: Tags now visible in edit modal and card views. All tags (including Numista-applied) are removable per-item — no more stuck tags (STAK-343, STAK-344)
- **Image Pipeline Simplification (v3.32.41)**: Removed coinImages IDB cache layer entirely. CDN URLs are now the sole Numista image source (STAK-339)

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides
