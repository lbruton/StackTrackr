## What's New

- **24hr Chart Improvements (v3.32.17)**: Intraday chart now uses clean 30-min bucketed ticks with styled hour/half-hour marks. Table extended to 12/24/48 configurable rows with trend indicators (▲/▼/—) per slot.
- **Market Chart Timezone Fix (v3.32.16)**: 24hr price chart and table now show times in your selected timezone. seed-sync skill gains Phase 5 — syncs from live API before releases.
- **Nitpick Polish (v3.32.15)**: API health modal now says "items tracked" instead of "coins". Desktop footer restructured — badges on top, Special thanks on its own line.
- **API Health Stale Timestamp Fix (v3.32.14)**: Spot history and Goldback timestamps now parsed as UTC — fixes inflated staleness readings in negative-offset timezones (CST, PST, etc.). Market stale threshold raised from 15 → 30 min to match actual poller cadence.
- **API Health Modal Fix + Three-Feed Checks (v3.32.13)**: Health modal no longer renders behind About modal. Health check now monitors market prices (15 min), spot prices (75 min), and Goldback daily separately; badges show per-feed freshness.
## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides
