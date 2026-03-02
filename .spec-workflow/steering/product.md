# Product Overview

## Product Purpose
StakTrakr is a precious metals inventory tracker for individual collectors and investors. It solves the problem of tracking portfolio value across gold, silver, platinum, palladium, and goldback holdings — providing real-time melt value calculations, retail price comparisons, and gain/loss analysis without requiring accounts, servers, or cloud infrastructure.

## Target Users
Individual precious metals collectors and investors who want to:
- Track their physical holdings (coins, bars, rounds, goldbacks) in one place
- See real-time portfolio value based on live spot prices
- Compare retail dealer prices across multiple providers
- Export portfolio data for tax reporting or insurance documentation
- Keep their financial data private and under their control (no accounts, no server storage)

## Key Features

1. **Portfolio Tracking**: Add items with purchase price, weight, quantity, and metal type. Automatic melt value calculation: `meltValue = weight * qty * spotPrice`
2. **Three-Price Model**: Every item shows Purchase Price (what you paid), Melt Value (intrinsic metal value), and Retail Price (current dealer asking price)
3. **Live Spot Prices**: Multi-provider spot price integration with automatic failover (StakTrakr API, Metals.dev, Metal Price API, custom endpoints)
4. **Retail Price Comparison**: Aggregated retail prices from major dealers, displayed per-item with premium calculations
5. **Cloud Sync**: AES-encrypted ZIP backup/restore to cloud storage — data never leaves your control unencrypted
6. **Import/Export**: CSV and JSON import/export for migration and reporting; PDF export with jsPDF for printable portfolio summaries
7. **Catalog Integration**: Numista and PCGS catalog lookup for coin identification, grading, and metadata enrichment
8. **Encrypted Vault**: Password-protected vault for storing sensitive notes per item (AES encryption via Forge)
9. **Image Management**: Per-item photo storage with local caching, bulk download, and format optimization
10. **Offline PWA**: Installable progressive web app with Service Worker caching — works fully offline and on `file://` protocol

## Business Objectives

- **Zero-dependency operation**: No accounts, no server, no build step — open `index.html` and it works
- **Privacy by default**: All data stored in browser localStorage; cloud sync is opt-in and encrypted
- **Offline-first**: Full functionality without internet; spot prices cached for offline portfolio viewing
- **Cross-platform**: Runs in any modern browser, on any OS, from local file or hosted URL

## Success Metrics

- **Reliability**: App loads and functions on file://, HTTP, and HTTPS without errors
- **Data integrity**: Zero data loss across version upgrades and cloud sync round-trips
- **Price freshness**: Spot prices within 75 minutes, retail prices within 30 minutes when online
- **Performance**: Sub-second render for inventories up to 1,000 items

## Product Principles

1. **Zero Build Step**: No webpack, no bundling, no transpilation. Raw HTML/CSS/JS that runs directly in the browser. This keeps the project accessible and eliminates build tooling failures.
2. **File Protocol Compatible**: Must work when opened as `file://index.html` — no CORS, no server assumptions. This enables USB/offline distribution.
3. **Privacy First**: No telemetry, no analytics, no external calls except explicit spot/retail price fetches. User data never leaves the browser unless the user initiates cloud sync.
4. **Vanilla JavaScript Only**: No React, no Vue, no frameworks. Direct DOM manipulation keeps the dependency surface at zero and the mental model simple.
5. **Offline Resilient**: Service Worker pre-caches all assets. Vendor libraries bundled locally with CDN fallback. App degrades gracefully when offline (cached spot prices, no retail).

## Monitoring & Visibility

- **Dashboard Type**: Single-page web app with card and table views
- **Real-time Updates**: Polling-based spot price refresh (configurable interval), manual retail price fetch
- **Key Metrics Displayed**: Total portfolio value (melt + retail), per-item gain/loss, spot price charts with history, API health status indicators
- **Sharing Capabilities**: PDF export, CSV export, JSON backup (encrypted), cloud sync for cross-device access

## Future Vision

### Potential Enhancements
- **Remote Access**: Cloud-hosted version with authentication for multi-device access without manual sync
- **Analytics**: Historical portfolio value trends, metal allocation charts, tax lot tracking
- **Collaboration**: Shared read-only portfolio links for insurance or estate planning purposes
