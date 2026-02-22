## What's New

- **Configurable Vault Idle Timeout (v3.32.12)**: New "Auto-lock after idle" dropdown in Settings → Cloud Sync — choose 15 min, 30 min, 1 hour, 2 hours, or Never before the vault password cache clears automatically
- **PR #395 Review Fixes (v3.32.11)**: logItemChanges null-guard for add/delete; changeLog writes use saveDataSync(); getManifestEntries/markSynced exposed as window globals; sync toast provider fixed ("ok" not "success"); backfill catch logs warn; api-health readyState guard; safeGetElement in initSpotHistoryButtons
- **Worktree Protocol & Branch Protection (v3.32.10)**: Agents now use isolated git worktrees (patch/VERSION) for concurrent work; main branch protected with Codacy required check; release skill creates/cleans up worktrees automatically
- **WeakMap Search Cache Correctness (v3.32.09)**: Cache miss guard uses strict undefined check; notes edits invalidate search cache immediately; undo/redo now reflects reverted field values in search
- **OAuth State Security Hardening (v3.32.08)**: Provider now parsed from trusted savedState after CSRF check; PKCE challenge adds .catch() to clean sessionStorage on failure; stale oauth state removed on exchange failure
## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides
