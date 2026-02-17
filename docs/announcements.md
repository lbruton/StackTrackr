## What's New

- **Keyless Provider Fixes & Hourly History Pull (v3.30.02)**: Fixed keyless providers (STAKTRAKR) enabling sync buttons, connected status, and auto-select. STAKTRAKR usage counter with 5000 default quota. Hourly history pull for STAKTRAKR (1–30 days) and MetalPriceAPI (up to 7 days). History log distinguishes hourly entries. One-time migration for existing users
- **StakTrakr Free API Provider & UTC Poller Fix (v3.30.01)**: Free, keyless StakTrakr API provider at rank 1 fetching hourly spot prices. Provider panel with "Free" badge and best-effort disclaimer. 1st–5th priority labels across all providers. Poller switched to UTC for timezone-neutral paths. Auto-sync works without any API keys
- **Card View Engine, Mobile Overhaul & UI Polish (v3.30.00)**: Three card view styles (Sparkline Header, Full-Bleed, Split Card) with header button cycling. CDN image URLs with dedicated table image column and card thumbnails. Mobile viewport overhaul with responsive breakpoints. Rows-per-page options with floating back-to-top button. Theme-aware sparkline colors. CSV/JSON/ZIP export includes image URLs (STAK-118, STAK-106, STAK-124, STAK-125, STAK-126)
- **Fix What's New Modal Showing Stale Version (v3.29.08)**: Version check uses APP_VERSION directly instead of potentially stale localStorage value. Service worker local assets switched to stale-while-revalidate so deployment updates propagate on next load

## Development Roadmap

- **Chart Overhaul (STAK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STAK-51)**: Header mapping UI with saved import profiles
- **PCGS Deep Integration (STAK-99)**: View Modal verification and price guide lookup
