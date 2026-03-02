# StakTrakr Wiki Audit - 2026-03-01

This audit cross-checks the project's documentation in `wiki/` against the current codebase in `lbruton/StakTrakr` (dev branch) and `lbruton/StakTrakrApi` (main branch).

## Frontend Audit (lbruton/StakTrakr)

| Wiki Page | Status | Inaccuracy | Location | Suggested Correction |
|-----------|--------|------------|----------|----------------------|
| `frontend-overview.md` | ⚠️ | `APP_VERSION` is `v3.33.18` | L10, L23 | Update to `v3.33.19`. |
| `frontend-overview.md` | ⚠️ | "There are currently 70 <script> tags" | L33, L41 | Update to "67 <script> tags". |
| `data-model.md` | ⚠️ | Missing `ALLOWED_STORAGE_KEYS` | L115+ | Add missing keys: `headerBtnOrder`, `headerAboutBtnVisible`, `tagBlacklist`, `numista_tags_auto`, `cloud_sync_migrated`, `cloud_backup_history_depth`, `retailManifestGeneratedAt`, `retailManifestSlugs`, `showRealizedGainLoss`. |
| `sync-cloud.md` | ⚠️ | `APP_VERSION` is `v3.32.41` | L10 | Update to `v3.33.19`. |
| `retail-modal.md` | ⚠️ | Missing `goldback` vendor | L115 | Add `goldback` to the vendor roster table (Color: `#d4a017`). |
| `release-workflow.md` | ⚠️ | `APP_VERSION` is `v3.32.24` | L10, L41 | Update to `v3.33.19`. |
| `service-worker.md` | ⚠️ | `APP_VERSION` is `v3.33.18` | L10, L28, L33, L51 | Update to `v3.33.19`. |

## Infrastructure Audit (lbruton/StakTrakrApi)

| Wiki Page | Status | Inaccuracy | Location | Suggested Correction |
|-----------|--------|------------|----------|----------------------|
| `architecture-overview.md`| ❌ | `run-local.sh` schedule | L18 | Change `0 * * * *` to `15,45 * * * *` (default `CRON_SCHEDULE`). |
| `architecture-overview.md`| ❌ | `run-spot.sh` schedule | L19 | Change `5,20,35,50` to `0,30`. |
| `architecture-overview.md`| ❌ | `spot_prices NOT yet in Turso` | L38, L71 | Mark as implemented; `spot-extract.js` writes to Turso. |
| `fly-container.md` | ❌ | `run-local.sh` schedule | L51 | Change `0 * * * *` to `15,45 * * * *`. |
| `fly-container.md` | ❌ | `run-spot.sh` schedule | L52 | Change `5,20,35,50` to `0,30`. |
| `fly-container.md` | ❌ | `run-goldback.sh` schedule | L55 | Change `0 20 * * *` to `1 * * * *`. |
| `goldback-pipeline.md` | ❌ | "no separate goldback cron" | L25, L112 | Update to reflect `run-goldback.sh` runs at `1 * * * *`. |
| `goldback-pipeline.md` | ❌ | `providers.json` coin count | L11 | `providers.json` in main branch has 11 coins, not 56+6. |
| `spot-pipeline.md` | ❌ | Writes to files, not Turso | L13, L20 | Mark as implemented; `spot-extract.js` handles Turso writes. |
| `spot-pipeline.md` | ❌ | Uses `poller.py` | L11, L40 | Update to `spot-extract.js` (Node.js). |
| `spot-pipeline.md` | ❌ | Cadence `5,20,35,50` | L17, L40 | Update to `0,30 * * * *` (every 30 min). |
| `cron-schedule.md` | ❌ | `run-local.sh` schedule | L15, L25 | Change `0` to `15,45` (default). |
| `cron-schedule.md` | ❌ | `run-spot.sh` schedule | L16, L25 | Change `5,20,35,50` to `0,30`. |
| `health.md` | ⚠️ | Spot Critical threshold | L45 | Python code uses `75` min, table says `75` min, but cadence is `30` min. 75 min is correct for 2x/hr. |
| `secrets.md` | ⚠️ | `CRON_SCHEDULE` default | L25 | Mention default is `15,45`, not `0`. |
| `turso-schema.md` | ❌ | `spot_prices NOT yet in Turso` | L15 | Mark as implemented. |
| `vendor-quirks.md` | ⚠️ | Goldback pipeline | L142 | Clarify `run-goldback.sh` is still active at `:01` hourly. |

## Summary of Findings
- **Total Pages Audited:** 15
- **Total Inaccuracies:** 24
- **Major Issues:** The Infrastructure documentation is significantly out of sync with the recent migration to Turso and Node.js-based spot polling. Cron schedules in documentation also do not match the `docker-entrypoint.sh` configuration. Goldback pipeline documentation claims the legacy scraper is retired, but it is still scheduled hourly in the container.
