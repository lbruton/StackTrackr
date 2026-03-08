## What's New

- **ZIP Restore DiffModal (v3.33.60)**: ZIP backup restore now routes through DiffModal for item and settings review instead of directly overwriting localStorage (STAK-457).
- **DiffModal Settings Renderers (v3.33.59)**: Five rich chip-strip renderers replace opaque "N items" text for complex settings. Per-element click-to-pick merge for chip configs, seed rules, and provider priorities. itemTags leak fixed (STAK-455).
- **DiffModal Item Cards (v3.33.58)**: Item cards with bordered layout, metal-colored image placeholders, async image loading, and click-to-pick field selection for granular merge control on modified items (STAK-454).
- **DiffModal UX Overhaul (v3.33.56)**: Card-based diff review with summary dashboard, per-item conflict cards with click-to-pick resolution, 7 settings category groups with human-readable labels, progress tracker for sync conflicts (STAK-451).
- **Dropbox Multi-Account UX (v3.33.55)**: Connected Dropbox account email and display name now shown in Cloud settings. Switch Account button forces re-authentication (STAK-449).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support
