## What's New

- **Goldback Sorting Fix (v3.30.05)**: Sorting by Melt, Retail, Gain/Loss, and Weight columns now correctly handles Goldback items. Previously a ½ Goldback was computed as 0.5 ozt instead of 0.0005 ozt, inflating sort values ~1000x. Retail and Gain/Loss sorting now uses denomination pricing
- **Pagination Dropdown Fix & Settings Reorganization (v3.30.04)**: Settings "Visible rows" dropdown now includes value 6, preventing silent fallback when switching views. Default items-per-page changed from 12 to 6. Added 128 and 512 options. "Table" tab renamed to "Inventory" with card settings consolidated
- **PumpkinCrouton Patch — Purity Input & Save Fix (v3.30.03)**: Added .9995 (pure platinum) to purity dropdown. Custom purity accepts 4 decimal places. Fixed save corruption where hidden custom purity input blocked all form submissions. Duplicate items now preserve original purchase date. Thanks to u/PumpkinCrouton for the report (STAK-130)
- **Keyless Provider Fixes & Hourly History Pull (v3.30.02)**: Fixed keyless providers (STAKTRAKR) enabling sync buttons, connected status, and auto-select. STAKTRAKR usage counter with 5000 default quota. Hourly history pull for STAKTRAKR (1–30 days) and MetalPriceAPI (up to 7 days). History log distinguishes hourly entries. One-time migration for existing users
- **StakTrakr Free API Provider & UTC Poller Fix (v3.30.01)**: Free, keyless StakTrakr API provider at rank 1 fetching hourly spot prices. Provider panel with "Free" badge and best-effort disclaimer. 1st–5th priority labels across all providers. Poller switched to UTC for timezone-neutral paths. Auto-sync works without any API keys

## Development Roadmap

- **Chart Overhaul (STAK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STAK-51)**: Header mapping UI with saved import profiles
- **PCGS Deep Integration (STAK-99)**: View Modal verification and price guide lookup
