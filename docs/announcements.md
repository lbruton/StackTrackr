## What's New

- **15-Min Spot Price Endpoint (v3.32.19)**: New sub-hourly price snapshots at data/15min/YYYY/MM/DD/HHMM.json — written every 15 min by the spot poller. Frontend fetchStaktrakr15minRange() loads 24h of 15-min data tagged api-15min.
- **Cloud Sync Status Icon (v3.32.18)**: Ambient header icon replaces the on-load password modal. Orange = needs password (tap to unlock), green = active, gray = not configured.
- **24hr Chart Improvements (v3.32.17)**: Intraday chart now uses clean 30-min bucketed ticks with styled hour/half-hour marks. Table extended to 12/24/48 configurable rows with trend indicators (▲/▼/—) per slot.
- **Market Chart Timezone Fix (v3.32.16)**: 24hr price chart and table now show times in your selected timezone. seed-sync skill gains Phase 5 — syncs from live API before releases.
- **Nitpick Polish (v3.32.15)**: API health modal now says "items tracked" instead of "coins". Desktop footer restructured — badges on top, Special thanks on its own line.
## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides
