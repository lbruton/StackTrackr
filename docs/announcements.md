## What's New

- **Retail Price Accuracy (v3.33.67)**: Fixed Provident Metals picking up spot ticker instead of product price; fixed Hero Bullion returning bulk "As Low As" price instead of 1-unit table price; Gainesville Coins no longer wastes 15s on a Playwright timeout per coin (STAK-467).
- **Retail Price Reliability (v3.33.61&ndash;v3.33.66)**: Improved scraping success rate for Bullion Exchanges and JM Bullion — Cloudflare-blocked requests now fall back to a Byparr (Camoufox) cookie-based bypass. Fixed sidecar API endpoint so CF cookies are actually retrieved (STAK-462).
- **Market Price Chart Fixes (v3.33.62)**: 7-day trend charts now correctly detect anomalous first/last data points and carry OOS prices as flat dotted lines instead of drifting trends (STAK-463).
- **DiffModal Complete Overhaul (v3.33.56&ndash;v3.33.60)**: Full card-based cloud sync review — summary dashboard, per-item conflict cards with click-to-pick field resolution, 7 settings categories with rich chip renderers, and ZIP backup restore now routes through DiffModal instead of silently overwriting (STAK-451, STAK-454, STAK-455, STAK-457).
- **Dropbox Multi-Account UX (v3.33.55)**: Connected Dropbox account email and display name shown in Cloud settings. New Switch Account button forces re-authentication to prevent auto-connecting the wrong account (STAK-449).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support
