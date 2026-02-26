## What's New

- **Retail Anomaly Filter (v3.32.45)**: 24h retail chart now detects and suppresses vendor price spikes deviating >40% from window median. Anomalous table cells shown with line-through styling (STAK-325).
- **Kilo &amp; Pound Weight Units (v3.32.44)**: Added kilogram and pound to the weight unit dropdown. Melt values convert correctly. Table, cards, and modals all display in the chosen unit (STAK-338).
- **Numista Tag Fixes (v3.32.43)**: Tags now visible in edit modal and card views. All tags (including Numista-applied) are removable per-item — no more stuck tags (STAK-343, STAK-344).
- **Pattern Rule Promotion Fix (v3.32.42)**: "Apply to all matching items" now works even when the item was saved previously (STAK-339-followup).
- **Image Pipeline Simplification (v3.32.41)**: Removed coinImages IDB cache layer entirely. CDN URLs are now the sole Numista image source (STAK-339).

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides
