## What's New

- **API Health Stale Timestamp Fix (v3.32.14)**: Spot history and Goldback timestamps now parsed as UTC — fixes inflated staleness readings in negative-offset timezones (CST, PST, etc.). Market stale threshold raised from 15 → 30 min to match actual poller cadence.
- **API Health Modal Fix + Three-Feed Checks (v3.32.13)**: Health modal no longer renders behind About modal. Health check now monitors market prices (15 min), spot prices (75 min), and Goldback daily separately; badges show per-feed freshness.
- **Configurable Vault Idle Timeout (v3.32.12)**: New "Auto-lock after idle" dropdown in Settings → Cloud Sync — choose 15 min, 30 min, 1 hour, 2 hours, or Never before the vault password cache clears automatically
- **PR #395 Review Fixes (v3.32.11)**: logItemChanges null-guard for add/delete; changeLog writes use saveDataSync(); getManifestEntries/markSynced exposed as window globals; sync toast provider fixed ("ok" not "success"); backfill catch logs warn; api-health readyState guard; safeGetElement in initSpotHistoryButtons
- **Worktree Protocol & Branch Protection (v3.32.10)**: Agents now use isolated git worktrees (patch/VERSION) for concurrent work; main branch protected with Codacy required check; release skill creates/cleans up worktrees automatically
## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides
