# WIKI_AUDIT_CODEX

Generated on 2026-03-01.

Comparison baseline:

- `StakTrakr` local `dev` at `e9b370b20e649a3168de8cce199b9a3cf76b319b`
- `StakTrakrApi` local `main` at `d5cf8c0b65f4d32b4afb89b0e92a5d5c4a84ee2a`

Scope:

- Reviewed every file currently under `/Volumes/DATA/GitHub/StakTrakr/wiki/`
- Page line numbers below refer to the wiki file itself
- Findings are based on the requested branch baselines above, even when a wiki page appears to describe a planned or future state

## Findings

## README.md

- Lines `19-20`: The ownership table says home poller environment/config ownership lives in `lbruton/stakscrapr`, but the tracked home poller setup currently lives in `StakTrakrApi/devops/home-scraper/` (`setup-lxc.sh`, `run-home.sh`). Proposed fix: update the ownership note to reflect that the committed source now lives in `StakTrakrApi`, or explicitly mark `stakscrapr` as a legacy/external context.

## _sidebar.md

- Lines `20-29`: The Frontend navigation is incomplete. It omits `backup-restore.md` and `image-pipeline.md`, even though both files exist in `wiki/` and `README.md` includes them in the Frontend table. Proposed fix: add `Backup & Restore` and `Image Pipeline` links to the Frontend section.

## api-consumption.md

- Lines `31-32`: The page says `api-health.js` currently checks `spot-history-YYYY.json` for spot freshness and therefore always reads stale. The current health path reads hourly feed data instead. Proposed fix: rewrite this as a historical bug that was fixed, and state that health checks now use live hourly spot files.
- Line `79`: The page says `manifest.json` is consumed via `API_PROVIDERS.STAKTRAKR.parseBatchResponse()`, but that parser is for spot batch payloads, not the retail manifest flow. Proposed fix: document `manifest.json` as being consumed by retail/health code paths, and reserve `parseBatchResponse()` for hourly/15-minute spot feeds.

## architecture-overview.md

- Lines `13`, `91-93`: The page says the current system has `17` coins, but the committed `data/api/manifest.json` reports `coin_count: 11`. Proposed fix: update the current-state count to `11`, or clearly label `17` as planned/live-but-not-in-repo.
- Lines `14`, `28`, `58`, `92`, `114`, `139`: The page says spot polling does not write to Turso and that Turso is retail-only. Current `spot-extract.js` writes into Turso `spot_prices`, and `api-export.js` exports spot JSON back out from Turso. Proposed fix: update the architecture to show spot data flowing through Turso before JSON export.
- Lines `25-26`, `44`, `91`: The page shows Fly retail at `0 * * * *`, but the current Fly default is `15,45 * * * *` via `CRON_SCHEDULE`. Proposed fix: replace the documented default retail cadence with `15,45 * * * *`.
- Lines `60-68`, `101-105`: The page says GitHub Pages serves `main` and that “Merge Poller Branches” runs every 15 minutes to merge `api` into `main`. The committed publish script force-pushes `HEAD:api`, and the workflow is retired/manual-only. Proposed fix: document `api` as the published branch and mark the merge workflow as retired/manual-only.
- Line `128`: The page says a `providers.json` URL fix should be pushed to the `api` branch, but current provider data is Turso-first and `providers.json` is generated output. Proposed fix: direct updates to Turso / `provider-db.js`, not the generated branch file.

## backup-restore.md

- Line `59`: The `settings.json` row says ZIP backups include “currency,” but `createBackupZip()` does not export `displayCurrency` in the settings payload. Proposed fix: remove “currency” from the row, or add `displayCurrency` to ZIP export before documenting it.
- Lines `130`, `180-184`: The page documents active cloud paths as flat-root `/StakTrakr/...`, but the current active sync paths live under `/StakTrakr/sync/...`, with flat-root constants kept only for legacy migration. Proposed fix: update the documented paths to `/StakTrakr/sync/` and call the flat-root paths legacy.
- Lines `207-209`: The page says the conflict prompt appears when item counts diverge between the pre-pull snapshot and pulled data. Current conflict detection is driven by local-vs-remote sync divergence, while the snapshot is only a rollback backup. Proposed fix: describe the snapshot as rollback-only and explain that the conflict modal appears when both local and remote have diverged.

## cron-schedule.md

- Lines `22-40`: The documented Fly crontab does not match the current generated crontab. The committed entrypoint writes `run-local.sh` at `15,45`, `run-spot.sh` at `0,30`, `run-publish.sh` at `8,23,38,53`, `run-retry.sh` at `15`, and `run-goldback.sh` at `1`. Proposed fix: replace the table and raw crontab block with the cron currently emitted by `docker-entrypoint.sh`.
- Lines `47-61`: The timeline assumes a `:00` retail run, `:05/:20/:35/:50` spot runs, and an older cadence model. Proposed fix: rebuild the timeline around the current committed schedule (`:15/:45` retail, `:00/:30` spot).
- Lines `67-71`: The page says the home poller is “Firecrawl only, no Vision,” but `run-home.sh` runs the vision path when `GEMINI_API_KEY` is present. Proposed fix: change this to “Vision optional when `GEMINI_API_KEY` is available.”

## data-model.md

- Lines `27`, `40`, `305-306`: The documented melt formula omits purity and Goldback unit conversion. Current `computeMeltValue()` uses `weightOz * qty * spot * purity`, with `gb` units converted first. Proposed fix: update every melt formula example to include purity and the Goldback conversion path.
- Lines `28-29`, `308-312`: The page says `saveData()`/`saveDataSync()` enforce `ALLOWED_STORAGE_KEYS` and silently discard unregistered keys, but those helpers do not enforce the allowlist on write. Proposed fix: describe `ALLOWED_STORAGE_KEYS` as a cleanup/restore allowlist enforced by `cleanupStorage()`, not a write-time guard in `saveData`.
- Lines `30`, `110-116`, `317-318`: The page says spot state is exposed as `window.spotPrice`, but the current shared state object is `spotPrices`. Proposed fix: replace `window.spotPrice` references with `spotPrices`.
- Lines `53-64`: The documented item schema is stale. Current items use `uuid` and `price`, not `id`, and tags are stored separately in `itemTags` rather than on the inventory object. Proposed fix: replace the sample schema with the current `uuid`/`price` shape and note that tags live in `itemTags`.
- Line `281`: `manifestPruningThreshold` is described as “days to keep manifest entries,” but the current code uses it as a count of sync cycles. Proposed fix: rename it to “max sync cycles retained before pruning.”

## dom-patterns.md

- Lines `22-25`, `33-35`, `112-124`: The page says raw `document.getElementById()` is only allowed in `js/about.js` and `js/init.js`, but current code still uses raw lookups in other frontend files such as `js/card-view.js` and `js/inventory.js`. Proposed fix: soften this from an absolute rule to a preferred pattern, and note that pre-`init.js` and legacy paths still use raw lookups.

## fly-container.md

- Lines `13`, `33`: The page says the Fly VM has `4GB RAM`, but current `fly.toml` sets `memory = '8192'`. Proposed fix: update memory to `8192 MB` / `8 GB`.
- Lines `23`, `67-70`: The page says Goldback has moved fully into the regular retail pipeline and there is no separate Goldback cron. Current Fly still schedules `run-goldback.sh`, and the committed API manifest still has no `goldback-g1` slug. Proposed fix: document the standalone Goldback cron as current branch behavior.
- Line `49`: The page says the Playwright service has `BLOCK_MEDIA=True` and “no proxy,” but the current service is wired with `PROXY_SERVER="%(ENV_HOME_PROXY_URL_2)s"` and no `BLOCK_MEDIA` setting. Proposed fix: replace this with the actual `PROXY_SERVER` env wiring and remove the `BLOCK_MEDIA` claim.
- Lines `62-70`: The Fly cron table is stale and does not match the current generated crontab. Proposed fix: update the cron table to match `docker-entrypoint.sh`.
- Line `80`: The page says Tailscale is inactive because `tailscaled` is not in supervisord, but `supervisord.conf` currently defines both `tailscaled` and `tailscale-up`. Proposed fix: mark Tailscale as active and managed by supervisord.
- Lines `105`, `138`, `146-147`: The page says the main scrape sets `PROXY_DISABLED=1`, that `PROXY_DISABLED` comes from `fly.toml`, and that Webshare credentials are inactive. Current `fly.toml` does not define `PROXY_DISABLED`, and `run-retry.sh` actively uses Webshare credentials. Proposed fix: describe `PROXY_DISABLED` as a retry-path override and mark Webshare as active for that path.
- Line `182`: The page says `run-local.sh` seeds the persistent repo clone when `.git` is missing, but current `run-local.sh` exits with an error if the clone is missing. Proposed fix: document that the script expects a pre-existing git repo on the mounted volume.

## frontend-overview.md

- Line `27`: The page says all application state persists in `localStorage`, but persistent image and metadata caches also live in IndexedDB. Proposed fix: state that most scalar app state lives in `localStorage`, while image/cache data lives in IndexedDB.
- Lines `73-79`: The “Active feature flags” table lists only three flags, but the current `FEATURE_FLAGS` object contains ten entries. Proposed fix: either expand the table to all current flags or relabel it as a narrower market-focused subset.
- Lines `81-100`: The “Key globals exposed on `window`” table is partially wrong. `safeGetElement()` is defined in `js/init.js`, `js/utils.js` explicitly exports only `saveDataSync`/`loadDataSync`, `retailPrices` is not on `window`, and the current spot object is `spotPrices`, not `window.spotPrice`. Proposed fix: rename the section to “cross-file globals” and correct each entry to match the current defining file and actual explicit exports.
- Lines `106-114`: The “Key subsystems” table references stale file names such as `js/items.js`, `js/retail-pricing.js`, `js/spot-price.js`, `js/spot-history.js`, `js/cloud-settings.js`, and `js/catalog.js`. Proposed fix: replace them with the currently loaded modules from `index.html`.
- Lines `140-141`: The page says disposal uses `#dispositionModal`, but the actual modal is `#removeItemModal` with embedded disposition fields. Proposed fix: rename the modal reference to `#removeItemModal`.

## goldback-pipeline.md

- Lines `24-30`, `172-174`: The page says there is no separate Goldback cron and that `run-goldback.sh` / `goldback-scraper.js` are not wired in. Current Fly still schedules `run-goldback.sh`, which still runs `goldback-scraper.js`. Proposed fix: restore the dedicated Goldback cron path in the overview and mark it active on `main`.
- Lines `153-156`: The page marks `data/goldback-YYYY.json` as “Not active,” but the current Goldback job still appends that yearly file and stages it for commit. Proposed fix: mark `data/goldback-YYYY.json` as an active legacy output.
- Lines `158-166`: The page says per-state Goldback per-slug endpoints are currently published, but the committed API manifest still lists only 11 non-Goldback coins; the only active committed Goldback API artifact is `goldback-spot.json`. Proposed fix: move the per-state endpoint matrix into a planned/future section and document `goldback-spot.json` as the current published Goldback endpoint.

## health.md

- Lines `92-93`: The page says “Merge Poller Branches” runs every 15 minutes, but the current workflow is retired/manual-only. Proposed fix: relabel that check as manual-only (or remove it from routine health checks).
- Lines `132`, `182-189`: The page treats `CRON_SCHEDULE=0` as the current/default Fly retail schedule, but current `CRON_SCHEDULE` defaults to `15,45`. Proposed fix: replace `0` with `15,45` wherever current-state behavior is described.

## home-poller.md

- Lines `101`, `311`: The page says the `/failures` view is based on `3+` failures in the last `10` days, but the current code uses a `7`-day window. Proposed fix: change `10 days` to `7 days`.
- Lines `131`, `137`: The page hard-codes the home proxy as `http://100.112.198.50:8888`, but the current Fly-side proxy wiring uses `HOME_PROXY_URL_2` on port `8889`. Proposed fix: update the documented proxy endpoint to `http://100.112.198.50:8889` or reference `HOME_PROXY_URL_2` instead of a literal URL.
- Lines `169-170`: The Fly comparison column says Playwright “connects to service,” but current Fly config sets `PLAYWRIGHT_LAUNCH=1`, so `price-extract.js` launches local Chromium in that mode. Proposed fix: describe Fly Phase 2 as local Chromium launch, with the separate Playwright service used by Firecrawl.

## image-pipeline.md

- Lines `17`, `21-23`: The page documents the StakTrakr frontend client-side IndexedDB image system, but this page is being treated as part of the `StakTrakrApi` wiki set and does not match the current `StakTrakrApi` repo structure. Proposed fix: move this page into the actual frontend owner set, or rewrite it to cover an API-side screenshot/artifact pipeline instead.

## poller-parity.md

- Lines `19`, `41`: The page says Fly runs at `:00`, but the current committed Fly retail cadence is `:15/:45`, while home remains `:30`. Proposed fix: update the schedule comparison to Fly `:15/:45` and home `:30`.
- Lines `146-149`: The page says the Fly Playwright service uses `PROXY_SERVER=http://p.webshare.io:80` and `BLOCK_MEDIA=True`. Current service config uses `PROXY_SERVER="%(ENV_HOME_PROXY_URL_2)s"` and does not set `BLOCK_MEDIA`. Proposed fix: replace the row with the actual env wiring and remove the `BLOCK_MEDIA` claim.
- Lines `185-188`: The page says the home poller is on a newer `playwright` package than the repo, but current home setup copies the shared `package.json`, which pins both `playwright` and `playwright-core` to the same versions. Proposed fix: remove the package drift claim unless a separate committed home `package.json` exists.
- Lines `212-215`: The page lists `jmbullion` and `bullionexchanges` as current `PLAYWRIGHT_ONLY_PROVIDERS`, but the current set is empty. Proposed fix: update this section to show an empty set.
- Lines `221-225`, `256-257`: The page documents `6000ms` waits for slow providers, but current Firecrawl and Playwright waits are `8000ms`. Proposed fix: change the wait value to `8000ms`.
- Line `237`: The page says `FRACTIONAL_EXEMPT_PROVIDERS` only contains `jmbullion`, but the current set includes both `jmbullion` and `bullionexchanges`. Proposed fix: add `bullionexchanges`.

## provider-database.md

- Line `28`: The page says current stats are `73 coins`, but the committed API manifest currently reports `11`. Proposed fix: update the committed-branch stats to `11`, or explicitly label `73` as a live-Turso value not represented in `main`.
- Lines `88-89`: The page defines `idx_pv_enabled` as an index on `provider_vendors(enabled)`, but the current schema creates it on `(coin_slug, enabled)`. Proposed fix: update the index definition accordingly.
- Line `97`: The page says all `provider-db.js` functions take a Turso `client` first, but current file helpers such as `loadProvidersFromFile(dataDir)` do not. Proposed fix: narrow this to “most DB functions,” or document the file-fallback helpers as exceptions.
- Lines `113`, `214`: The page says failure stats use a `10`-day window, but the current query uses `7` days. Proposed fix: change both references from `10 days` to `7 days`.
- Lines `129-130`: The page says the repo may still be missing `getCoverageStats` and `getMissingItems`, but both functions are already present. Proposed fix: remove those functions from the “not committed yet” note.

## providers.md

- Line `112`: The page says the current `krugerrand-silver` year-start Monument Metals URL is the random-date SKU, but the committed `providers.json` uses the 2026-specific SKU. Proposed fix: update the row to the committed 2026 URL, or explicitly label the random-date URL as historical.

## release-workflow.md

- Line `55`: The page says the current version is `3.32.24`, but current `APP_VERSION` is `3.33.19`. Proposed fix: update the example to `3.33.19`, or remove the hardcoded “current value” note and document only the format.
- Lines `63-75`: The page documents a single lock object and says agents may “take over” an expired lock. Current release docs use a `claims` array model and explicitly say agents do not take over another agent’s version. Proposed fix: rewrite the lock section around the `claims` array workflow and remove the takeover language.
- Lines `92-105`: The page says `/release patch` always bumps exactly 7 files and includes wiki as file 7. Current release docs describe 5 manual version edits, `sw.js` auto-stamping, conditional seed data, and `wiki-update` as a post-commit step rather than a version file. Proposed fix: split these responsibilities accurately and move `wiki-update` into the post-commit phase.
- Lines `195-196`, `245`: The page says cleanup should delete `devops/version.lock`, but current lock cleanup removes only the matching claim and deletes the file only if no claims remain. Proposed fix: change cleanup to “remove your claim entry; delete the file only when empty.”

## rest-api-reference.md

- Lines `102-116`, `228-238`: The page says the current API includes `17` bullion coins, `56` per-state Goldback slugs, `6` deprecated Goldback slugs, and all related endpoint families. The committed API manifest currently contains only `11` non-Goldback coin slugs. Proposed fix: update the current endpoint inventory to the 11 committed slugs and move the Goldback-per-state matrix into a planned/future section.
- Lines `181-182`: The page says spot endpoints update every 15 minutes, but current `run-spot.sh` runs twice hourly (`:00` and `:30`). Proposed fix: change spot cadence to `2x/hr` / `:00` and `:30`.
- Lines `218`, `238`: The page says `data/api/goldback-spot.json` is currently produced from Turso / `goldback-g1`, but current branch behavior still uses the standalone Goldback scraper path. Proposed fix: document the active standalone scraper path until `goldback-g1` actually exists in the committed manifest.

## retail-modal.md

- Lines `25-26`: The page says Grid view is the default and Market List View is only the feature-flagged alternative, but `MARKET_LIST_VIEW` is currently enabled by default and renders first. Proposed fix: document Market List View as the current default and Grid view as the fallback.
- Lines `31-32`: The “Price History” tab is described as a candlestick-style chart, but current code renders a Chart.js `line` chart for daily history. Proposed fix: rename it to a daily line chart with per-vendor lines (or the fallback average series).
- Lines `221-229`, `440`: The intraday flow says `_buildIntradayChart()` passes `filled` directly to `_buildIntradayTable()`, but current code runs `_flagAnomalies(filled)` first and passes the processed array to the table. Proposed fix: insert `_flagAnomalies()` into the documented pipeline.
- Lines `405-406`: The page says `_forwardFillVendors` is module-private, but current code exports `_forwardFillVendors` and `_flagAnomalies` on `window`. Proposed fix: remove `_forwardFillVendors` from the module-private list and add `_flagAnomalies` to the documented exports.
- Lines `454-456`: The “OOS legend items disappearing” note is stale. Current legend logic includes OOS availability in the `hasAny` guard, so all-OOS vendors are not suppressed for that reason. Proposed fix: remove or rewrite this warning to match current legend behavior.

## retail-pipeline.md

- Lines `25-27`: The page says the current pipeline covers `17` bullion coins, but the committed API manifest reports `11`. Proposed fix: update the current-state scope to `11`, or explicitly label the larger count as planned/live-but-not-in-repo.
- Lines `35-38`: The page says the Fly retail cron is `0 * * * *`, but current default `CRON_SCHEDULE` is `15,45`. Proposed fix: change the Fly default retail cron to `15,45 * * * *` and note it is configurable.
- Lines `49-55`, `109-111`: The page says scrape scripts sync `providers.json` from the `api` branch and implies vision is Fly-only. Current scripts load providers from Turso (with file fallback), and both Fly and home can run the vision path when `GEMINI_API_KEY` is present. Proposed fix: rewrite this section around Turso-first provider loading and dual-poller vision capability.
- Lines `233-238`: The cron table says `run-spot.sh` runs at `5,20,35,50` and that `run-goldback.sh` is no longer scheduled. Current entrypoint schedules `run-spot.sh` at `0,30` and still schedules `run-goldback.sh` at minute `1`. Proposed fix: update the cron table to match current `docker-entrypoint.sh`.

## secrets.md

- Lines `39-40`: The page labels `WEBSHARE_PROXY_USER` / `WEBSHARE_PROXY_PASS` as “Playwright service proxy,” but current code uses them for the direct Playwright/Webshare fallback path in `price-extract.js` and `run-retry.sh`; the Playwright service itself is fed by `HOME_PROXY_URL_2`. Proposed fix: rename their purpose to “Webshare credentials for Playwright fallback / `run-retry.sh`” and add `HOME_PROXY_URL_2` as the Playwright service proxy input.

## service-worker.md

- Lines `42-46`: The “current source” example shows `staktrakr-v3.33.18-b1772346419`, but current `sw.js` uses `staktrakr-v3.33.19-b1772404151`. Proposed fix: update the example to the current cache name or remove the hardcoded example and keep only the format.
- Lines `54-56`: The cache strategy summary says API hosts are network-first and “everything else” is network-first with cache fallback. Current logic is more specific: CDN, StakTrakr API, and many local assets use stale-while-revalidate; only local JS/CSS are network-first; navigation returns the cached app shell. Proposed fix: split the strategy section into the actual strategy buckets used in `sw.js`.

## spot-pipeline.md

- Lines `13-15`, `28-34`: The page says the active spot path is the legacy Python `poller.py` and that spot data bypasses Turso. Current wrapper calls `spot-extract.js`, which writes into Turso `spot_prices`. Proposed fix: rewrite the active path around `spot-extract.js` plus Turso, and move `poller.py` into a clearly marked legacy section.
- Lines `20-24`, `148-154`: The page says spot polling runs `4x/hr` and shows a `poller.py --once` wrapper, but current cron is `0,30 * * * *` (`2x/hr`) and the wrapper runs `node /app/spot-extract.js`. Proposed fix: update cadence to `2x/hr` and replace the wrapper example.
- Lines `92-99`: The page says MetalPriceAPI values are always inverted, but current code only inverts when the returned rate is below `1`; otherwise it uses the returned value directly. Proposed fix: document the conditional conversion logic.
- Lines `105-143`: The page says each active poll writes hourly + 15-minute + daily seed files and runs `backfill_recent_hours()` first, but the active script writes hourly and 15-minute files only. Daily seed/backfill logic now belongs to the legacy Python poller path. Proposed fix: separate active `spot-extract.js` output from legacy `poller.py` behavior.

## storage-patterns.md

- Lines `21-24`, `45-50`: The page says direct `localStorage.getItem()` / `setItem()` calls are forbidden, but current code intentionally uses direct localStorage for certain scalar preference/flag strings (for example, cloud sync cursor and idle timeout keys). Proposed fix: narrow the rule so wrappers are required for structured JSON app data, while direct `localStorage` is allowed for intentional scalar string cases.
- Lines `81-82`: The page says `cleanupStorage()` runs “during startup and after imports,” but current code only wires it during startup (`DOMContentLoaded`). Proposed fix: change this to “during startup” unless an import path is reintroduced.

## sync-cloud.md

- Lines `27-32`, `91-92`: The page says sync files live directly under `/StakTrakr/`, but current active sync files live under `/StakTrakr/sync/`, with flat-root paths kept only as legacy constants. Proposed fix: update all active sync paths to `/StakTrakr/sync/...` and label flat-root paths as legacy.
- Lines `40-42`, `112`: The page says all `pushSyncVault()` / `pullSyncVault()` call sites must attach `.catch()`, but current implementations catch internally and there are intentional bare calls. Proposed fix: say `.catch()` is optional and only needed when a caller wants extra fallback logging/UI beyond the built-in handling.
- Lines `123-126`, `205-206`: The flowchart says remote pulls go straight to `pullSyncVault()`, but current no-local-changes and “Keep Theirs” flows route through `pullWithPreview()` first. Proposed fix: make `pullWithPreview()` the primary remote-pull path in both diagrams and describe `pullSyncVault()` as the lower-level restore call.
- Lines `222-223`: The page says the no-`debounce` fallback uses plain `setTimeout` with “no deduplication,” but current fallback still clears the prior timer before rescheduling. Proposed fix: say the fallback still coalesces calls via `clearTimeout`/`setTimeout`, but lacks the helper’s `.cancel()` method.

## turso-schema.md

- Lines `26-29`, `232`: The page says spot prices are not in Turso / “NOT yet in Turso,” but current schema includes `spot_prices` and the active spot poller writes into it. Proposed fix: update the overview and related note to say spot data now flows through Turso.
- Lines `32-34`, `84-86`, `176-180`: The table inventory is incomplete. Current schema also includes `provider_failures` and `spot_prices`, both created by `initTursoSchema()`. Proposed fix: add dedicated sections for `provider_failures` and `spot_prices`.
- Lines `199-219`: The documented `provider_vendors` DDL is wrong in two places: it shows `vendor_name` nullable and `idx_pv_enabled` on `(enabled)` only. Current schema uses `vendor_name TEXT NOT NULL` and `idx_pv_enabled` on `(coin_slug, enabled)`. Proposed fix: update the DDL and index definitions to match the committed schema.

## vendor-quirks.md

- Lines `173-181`: The Goldback section refers to `/exchange-rate/`, but the active committed scraper uses `https://www.goldback.com/exchange-rates/` (plural). Proposed fix: change the documented path to `/exchange-rates/`.

## Files Reviewed With No Confirmed Inaccuracies

- `CHANGELOG.md` (treated as a historical change log rather than a current-state reference)
- `wiki/index.html`

## Recurring Drift Themes

- Many `StakTrakrApi` pages still document older cron schedules (`:00` retail, `4x/hr` spot) instead of the current `docker-entrypoint.sh` schedule.
- Several infrastructure pages describe planned/live-state inventory counts (`17`, `73`, Goldback per-state slugs) that do not match the committed `main` branch outputs.
- Several frontend pages are stale around post-v3.32 changes: sync path migration to `/sync/`, release lock protocol changes, feature-flag defaults, and the service worker cache example.
