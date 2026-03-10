## What's New

- **Market Price Chart Fixes (v3.33.62)**: 7-day trend charts now correctly detect anomalous first/last data points and carry OOS prices as flat dotted lines instead of drifting trends (STAK-463).
- **Retail Price Reliability (v3.33.61)**: Improved scraping success rate for Bullion Exchanges and JM Bullion — Cloudflare-blocked requests now fall back to a cookie-based bypass, reducing missed prices from these vendors (STAK-462).
- **DiffModal Complete Overhaul (v3.33.56&ndash;v3.33.60)**: Full card-based cloud sync review — summary dashboard, per-item conflict cards with click-to-pick field resolution, 7 settings categories with rich chip renderers, and ZIP backup restore now routes through DiffModal instead of silently overwriting (STAK-451, STAK-454, STAK-455, STAK-457).
- **Dropbox Multi-Account UX (v3.33.55)**: Connected Dropbox account email and display name shown in Cloud settings. New Switch Account button forces re-authentication to prevent auto-connecting the wrong account (STAK-449).
- **Market View Improvements (v3.33.52, v3.33.57)**: Mobile search bar and controls layout fixed; metal filter pills (All / Silver / Gold / Goldback / Platinum / Palladium) added; Australian coins (Kangaroo, Koala, Kookaburra) now display correctly (STAK-433, STAK-434, STAK-452).
- **Numista N# Search Fixes (v3.33.53)**: Image URLs and metal types now auto-populated when adding items via Numista N# search — no more manual re-download workaround needed (STAK-431).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support
