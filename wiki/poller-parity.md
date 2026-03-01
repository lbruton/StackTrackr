---
title: "Poller Parity — Fly.io vs Home Poller"
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.18
date: 2026-02-26
sourceFiles: []
relatedPages: []
---

# Poller Parity — Fly.io vs Home Poller

> **Last verified:** 2026-02-26 — all 5 core JS files have identical MD5 hashes across both pollers. Both read from the same Turso database.

---

## Goal

Both pollers should produce identical scrape results for the same coin/vendor target, offset only by their cron schedule (Fly.io at `:00`, home at `:30`). Any configuration drift between them is a bug.

---

## Infrastructure Comparison

| Property | Fly.io Container | Home Poller (Ubuntu VM) |
|----------|-----------------|------------------------|
| **POLLER_ID** | `api` | `home` |
| **OS** | Debian Bookworm (node:20-slim) | Ubuntu 24.04 LTS |
| **Node.js** | 20.x (Docker base image) | 22.22.0 (system) |
| **Install path** | `/app/` | `/opt/poller/` |
| **BROWSER_MODE** | `local` | `local` |
| **PLAYWRIGHT_LAUNCH** | `1` | `1` |
| **PLAYWRIGHT_BROWSERS_PATH** | `/usr/local/share/playwright` | `/usr/local/share/playwright` |
| **Playwright package** | `playwright-core` (connects to Playwright Service) | `playwright` (full, bundled Chromium) |
| **Chromium source** | Playwright Service Docker stage (port 3003) | `npx playwright install chromium` (local) |
| **Firecrawl** | Self-hosted in-container (port 3002) | Self-hosted via supervisord (port 3002) |
| **FIRECRAWL_BASE_URL** | `http://localhost:3002` | `http://localhost:3002` |
| **Redis** | In-container | systemd |
| **RabbitMQ** | In-container | systemd |
| **Proxy (HOME_PROXY_URL_2)** | `""` (empty — not used) | Not set |
| **Cron schedule** | `:00` every hour | `:30` every hour |
| **Vision pipeline** | Yes (GEMINI_API_KEY set) | Yes (if GEMINI_API_KEY set in .env) |
| **Run script** | `run-local.sh` | `run-home.sh` |
| **Git push** | Yes (`run-publish.sh` at `:08/:23/:38/:53`) | No (Turso only) |
| **Tailscale** | Client (connects to home exit node) | Server (advertises exit node) |
| **Dashboard** | None | Port 3010 |
| **Monitoring** | None | Grafana (3000), Prometheus (9090), Metrics (9100) |

### Known Drift Points

| Issue | Impact | Resolution |
|-------|--------|------------|
| Node 20 (Fly) vs Node 22 (Home) | Minimal — ESM and all APIs are compatible | Pin home to Node 20 or accept minor runtime differences |
| `playwright-core` (Fly) vs `playwright` (Home) | Fly uses Playwright Service on port 3003; home launches Chromium directly | Both produce equivalent Chromium sessions — same browser version is key |
| Chromium version drift | Fly rebuilds from `ghcr.io/firecrawl/playwright-service:latest`; home updates via `npx playwright install` | After `fly deploy`, run `npx playwright install chromium` on home poller |
| HOME_PROXY_URL_2 empty on Fly | Fly Playwright never tries tinyproxy hop; home poller also lacks it (not in .env) | Currently equivalent — neither uses it |

---

## Shared Source Files (verified identical)

All 5 core JS files have **matching MD5 hashes** between the repo (`StakTrakrApi/devops/fly-poller/`) and the home poller (`/opt/poller/`):

| File | Purpose | Hash |
|------|---------|------|
| `price-extract.js` | Firecrawl + Playwright scraper | `aa5422f0...` |
| `capture.js` | Vision screenshot pipeline | `49b3587e...` |
| `provider-db.js` | Turso provider CRUD + bulk ops + coverage stats | *(updated 2026-02-26 — re-hash after next deploy)* |
| `db.js` | Turso write operations | `1fc71a0b...` |
| `turso-client.js` | Turso connection + schema | `2d01c8c7...` |

Both pollers read from the **same Turso database** — provider configuration, URLs, and enabled flags are always in sync.

---

## Full File Inventory Diff

### JS Files

| File | Repo | Home | Status |
|------|------|------|--------|
| `api-export.js` | Y | Y | **Identical** |
| `capture.js` | Y | Y | **Identical** |
| `db.js` | Y | Y | **Identical** |
| `export-providers-json.js` | Y | Y | **Identical** |
| `extract-vision.js` | Y | Y | **Identical** |
| `goldback-scraper.js` | Y | Y | **Identical** |
| `import-from-log.js` | Y | Y | **Identical** |
| `merge-prices.js` | Y | Y | **Identical** |
| `price-extract.js` | Y | Y | **Identical** |
| `provider-db.js` | Y | Y | **Identical** |
| `serve.js` | Y | Y | **Identical** |
| `turso-client.js` | Y | Y | **Identical** |
| `vision-patch.js` | Y | Y | **Identical** |
| `dashboard.js` | — | Y | Home-only (admin UI, port 3010) |
| `metrics-exporter.js` | — | Y | Home-only (Prometheus metrics, port 9100) |
| `migrate-providers.js` | Y | — | Repo-only (one-time STAK-348 migration) |

### Shell Scripts

| File | Repo | Home | Status |
|------|------|------|--------|
| `run-local.sh` | Y | Y | **DRIFT** (see below) |
| `run-home.sh` | — | Y | Home-only (home poller entry point) |
| `run-goldback.sh` | Y | Y | **Identical** |
| `run-spot.sh` | Y | Y | **Identical** |
| `run-publish.sh` | Y | Y | **DRIFT** (see below) |
| `run-retry.sh` | Y | — | Repo-only (T3 retry — Fly.io only) |
| `run-fbp.sh` | — | Y | Home-only (FBP backfill) |

### run-local.sh Drift

The **home poller copy** has diverged from the repo. Key differences:

| Area | Repo (Fly.io) | Home Poller |
|------|---------------|-------------|
| Tailscale egress | Block near line 39 (after providers log) | Block near line 19 (before providers) |
| T3 failure queue | Yes — logs failure count + systemic warning | No — removed |
| Vision pipeline gate | `GEMINI_API_KEY` only | `GEMINI_API_KEY` + `BROWSERLESS_URL` |
| Vision BROWSER_MODE | `local` | `browserless` |
| Post-scrape | "run-publish.sh will push on next cycle" | Runs `api-export.js` + `git add` inline |

> **Impact:** The home poller does NOT use `run-local.sh` — it uses `run-home.sh` instead. This drift is cosmetic (the file exists on the home poller from a previous sync but is unused). **Verify with:** `grep run-local /etc/cron.d/retail-poller` on the home poller.

### run-publish.sh Drift

| Area | Repo (Fly.io) | Home Poller |
|------|---------------|-------------|
| Lockfile guard | Yes (`/tmp/retail-publish.lock`) | No |
| Runs `api-export.js` | Yes (exports Turso → JSON) | No |
| Runs `export-providers-json.js` | Yes (Turso → providers.json) | No |

> **Impact:** `run-publish.sh` is Fly.io only (pushes to Git). The home poller copy is stale — it should not be called from any home poller cron.

---

## Firecrawl & Playwright Config Diff

### Playwright Service (supervisord)

| Config | Fly.io | Home Poller |
|--------|--------|-------------|
| Command | `node /opt/playwright-service/dist/api.js` | `node /opt/playwright-service/dist/api.js` |
| Port | 3003 | 3003 |
| `PLAYWRIGHT_BROWSERS_PATH` | `/usr/local/share/playwright` | `/usr/local/share/playwright` |
| `PROXY_SERVER` | `http://p.webshare.io:80` | **Not set** |
| `PROXY_USERNAME` / `PROXY_PASSWORD` | Webshare creds (from Fly secrets) | **Not set** |
| `BLOCK_MEDIA` | `True` | **Not set** |
| `HOME_PROXY_URL_2` | From env (empty string) | **Not set** |
| Chromium version | `chromium-1208` (from Docker stage) | `chromium-1208` (from `npx playwright install`) |
| Log output | `/dev/stdout` (Docker) | `/var/log/supervisor/playwright-service.log` |

> **Key difference:** Fly.io Playwright Service has Webshare proxy config and `BLOCK_MEDIA=True`. Home poller Playwright Service has neither. This means Firecrawl on Fly.io can route through a proxy when scraping via the Playwright microservice, but the home poller cannot. However, `price-extract.js` Playwright fallback (Phase 2) handles its own proxy chain independently of the Playwright Service.

### Firecrawl API (supervisord)

| Config | Fly.io | Home Poller |
|--------|--------|-------------|
| Command | `node /opt/firecrawl/dist/src/index.js` | `node /opt/firecrawl/dist/src/index.js` |
| Port | 3002 | 3002 |
| `REDIS_URL` | `redis://localhost:6379` | `redis://localhost:6379` |
| `PLAYWRIGHT_MICROSERVICE_URL` | `http://localhost:3003/scrape` | `http://localhost:3003/scrape` |
| `NUQ_RABBITMQ_URL` | `amqp://localhost:5672` | **Not set** |
| `POSTGRES_*` | Full PostgreSQL config | **Not set** |
| `USE_DB_AUTHENTICATION` | `false` | `false` |
| Firecrawl source | Docker stage `ghcr.io/firecrawl/firecrawl:latest` | Extracted from Docker image to `/opt/firecrawl/` |

> **Key difference:** Fly.io has NUQ (RabbitMQ + PostgreSQL) for Firecrawl's internal job queue. Home poller lacks these env vars — Firecrawl worker falls back to in-memory or Redis-only mode. This should not affect scrape results but may impact error recovery on the home poller.

### Firecrawl Worker

| Config | Fly.io | Home Poller |
|--------|--------|-------------|
| `NUQ_RABBITMQ_URL` | `amqp://localhost:5672` | **Not set** |
| `NUQ_DATABASE_URL` | `postgresql://postgres:firecrawl@localhost:5432/postgres` | `postgresql://postgres:firecrawl@localhost:5432/postgres` |
| `POSTGRES_*` | Full config | **Not set** |
| Extract worker | Yes (`firecrawl-extract-worker`) | **No** (not in supervisord) |

> **Key difference:** Home poller is missing the `firecrawl-extract-worker` process entirely, and lacks RabbitMQ URL in the worker config. The extract worker handles LLM-based extraction — not used by the retail poller, but its absence could cause Firecrawl to log warnings.

### package.json

| Dependency | Fly.io (repo) | Home Poller |
|------------|---------------|-------------|
| `playwright` | `^1.49.0` | `^1.58.2` |
| `playwright-core` | `^1.49.0` | `^1.49.0` |

> **Drift:** Home poller has `playwright@^1.58.2` (installed today) while repo pins `^1.49.0`. The `playwright` package is only used for `BROWSER_MODE=local` Chromium launch — the actual browser binary (`chromium-1208`) is the same version on both. Update the repo `package.json` to match: `"playwright": "^1.58.2"`.

### Chromium Browser

| Property | Fly.io | Home Poller |
|----------|--------|-------------|
| Version | `chromium-1208` | `chromium-1208` |
| Path | `/usr/local/share/playwright/chromium-1208` | `/usr/local/share/playwright/chromium-1208` + `/root/.cache/ms-playwright/chromium-1208` |
| Source | Copied from `ghcr.io/firecrawl/playwright-service:latest` Docker stage | `npx playwright install chromium` |
| Headless shell | `chromium_headless_shell-1208` | `chromium_headless_shell-1208` |
| FFmpeg | `ffmpeg-1011` | `ffmpeg-1011` |

> Both pollers are running the same Chromium build (v1208). Parity confirmed.

---

## Hardcoded Per-Vendor Rules (price-extract.js)

These are **NOT in Turso** — they are hardcoded Sets and Maps in `price-extract.js`. Both pollers execute the same code, so these are identical. Listed here for the complete picture.

### PLAYWRIGHT_ONLY_PROVIDERS (skip Firecrawl entirely)

| Vendor | Reason | Line |
|--------|--------|------|
| `jmbullion` | Firecrawl ignores `waitFor` — product table renders as "Loading..." — fractional_weight fires on nav links | 430 |
| `bullionexchanges` | Cloudflare bot detection redirects to homepage — markdown is a single banner image | 430 |

> **Note:** Both vendors are currently `enabled: false` in Turso for all coins, so this Set has no runtime effect.

### SLOW_PROVIDERS (extra wait time in Firecrawl + Playwright)

| Vendor | Firecrawl `waitFor` | Playwright extra wait | Reason | Line |
|--------|--------------------|-----------------------|--------|------|
| `jmbullion` | 6000ms | 8000ms | Next.js/React — price tables take ~5s | 422 |
| `herobullion` | 6000ms | 8000ms | React app — needs render time | 422 |
| `monumentmetals` | 6000ms | 8000ms | React Native Web SPA — router mounts at ~6s | 422 |
| `summitmetals` | 6000ms | 8000ms | Shopify SPA — JS render delay | 422 |
| `bullionexchanges` | 6000ms | 8000ms | React/Magento SPA — pricing grid at ~6-8s | 422 |

### PREORDER_TOLERANT_PROVIDERS (skip pre-order OOS detection)

| Vendor | Effect | Line |
|--------|--------|------|
| `jmbullion` | "Pre-Order" items treated as in-stock (they show purchasable prices) | 132 |

### FRACTIONAL_EXEMPT_PROVIDERS (skip fractional weight OOS check)

| Vendor | Reason | Line |
|--------|--------|------|
| `jmbullion` | Mega-menu always lists "1/2 oz Gold Eagle" etc. — causes false fractional_weight detection | 438 |

### MARKDOWN_CUTOFF_PATTERNS (trim page tail)

| Vendor | Patterns removed | Line |
|--------|-----------------|------|
| `sdbullion` | "Add on Items", "Customers Also Purchased" (markdown + HTML) | 134-142 |
| `jmbullion` | "Similar Products You May Like" (carousel with fractional coin prices) | 146-149 |

### MARKDOWN_HEADER_SKIP_PATTERNS (strip header/nav)

| Vendor | What's stripped | Line |
|--------|----------------|------|
| `jmbullion` | Spot price ticker in nav (e.g., "Gold Ask $5,120.96") — stripped by matching timestamp pattern | 155-159 |

### Firecrawl Config Overrides

| Vendor | `onlyMainContent` | `waitFor` | Line |
|--------|-------------------|-----------|------|
| `jmbullion` | `false` (disabled — React pages return empty with it on) | 6000ms | 449, 453 |
| All SLOW_PROVIDERS | default (`true`) | 6000ms | 453 |
| All others | `true` | none | 449 |

### Price Extraction Strategy (extractPrice)

| Vendor | Strategy order | Line |
|--------|---------------|------|
| `summitmetals` | `regularPricePrices()` → `tablePrices()` | 362 |
| `jmbullion` | `firstTableRowFirstPrice()` → `jmPriceFromProseTable()` → `asLowAsPrices()` | 370 |
| All others | `firstTableRowFirstPrice()` → `firstInRangePriceProse()` → `asLowAsPrices()` | 398 |

### Metal Price Ranges (per oz, for range validation)

| Metal | Min | Max | Line |
|-------|-----|-----|------|
| silver | $40 | $200 | 104 |
| gold | $1,500 | $15,000 | 105 |
| platinum | $500 | $6,000 | 106 |
| palladium | $300 | $6,000 | 107 |
| goldback | $5 | $25 | 108 |

---

## Hardcoded Per-Vendor Rules (capture.js)

### PROVIDER_PAGE_LOAD_WAIT (vision capture)

| Vendor | Wait (ms) | Default | Line |
|--------|-----------|---------|------|
| `jmbullion` | 10000 | 4000 | 53 |
| `monumentmetals` | 7000 | 4000 | 54 |
| `bullionexchanges` | 8000 | 4000 | 55 |
| `herobullion` | 6000 | 4000 | 56 |
| All others | 4000 (PAGE_LOAD_WAIT) | — | 45 |

### COINS allowlist (capture.js env default)

```
ase, age, ape, buffalo, maple-silver, maple-gold, britannia-silver,
krugerrand-silver, krugerrand-gold, generic-silver-round, generic-silver-bar-10oz
```

### PROVIDERS allowlist (capture.js env default)

```
apmex, sdbullion, jmbullion, monumentmetals, herobullion, bullionexchanges, summitmetals
```

> **Note:** `capture.js` uses both the Turso `enabled` flag AND this PROVIDERS allowlist as a double gate. A vendor must be in both to be captured.

---

## Active Coin/Vendor Matrix

15 coins with at least one enabled vendor. 5 active vendors. 48 enabled targets total.

Disabled vendors (jmbullion, bullionexchanges, sdbullion for gold) are omitted.

### Silver Coins (1 oz)

| Coin | APMEX | SD Bullion | Monument | Hero | Summit |
|------|-------|------------|----------|------|--------|
| **ase** (American Silver Eagle) | [Y](https://www.apmex.com/product/23331/1-oz-american-silver-eagle-coin-bu-random-year) | [Y](https://sdbullion.com/1-oz-american-silver-eagle-coins-random-year) | [Y](https://monumentmetals.com/1-oz-american-silver-eagle-bu-dates-our-choice.html) | [Y](https://www.herobullion.com/american-silver-eagle-1-oz-coin/) | [Y](https://summitmetals.com/products/1-oz-american-silver-eagle) |
| **maple-silver** (Silver Maple Leaf) | [Y](https://www.apmex.com/product/1090/1-oz-canadian-silver-maple-leaf-coin-bu-random-year) | [Y](https://sdbullion.com/canadian-silver-maple-leaf-coin-random-year) | [Y](https://monumentmetals.com/2026-canada-silver-maple-leaf.html) | [Y](https://www.herobullion.com/canadian-silver-maple-1-oz-coin/) | — |
| **britannia-silver** (Silver Britannia) | [Y](https://www.apmex.com/product/53532/great-britain-1-oz-silver-britannia-bu-random-year) | [Y](https://sdbullion.com/1-oz-britannia-silver-coin-random-year) | [Y](https://monumentmetals.com/doc-silver-britannia.html) | [Y](https://www.herobullion.com/1-oz-british-silver-britannia-coin/) | — |
| **krugerrand-silver** (Silver Krugerrand) | [Y](https://www.apmex.com/product/206258/south-africa-1-oz-silver-krugerrand-random) | [Y](https://sdbullion.com/south-african-silver-krugerrand-coin-random-year) | [Y](https://monumentmetals.com/2026-south-africa-1-oz-silver-krugerrand-bu.html) | [Y](https://www.herobullion.com/1-oz-south-african-silver-krugerrand/) | — |
| **generic-silver-round** (Generic Silver Round) | [Y](https://www.apmex.com/product/23/1-oz-silver-round-secondary-market) | [Y](https://sdbullion.com/1-oz-silver-rounds-new) | [Y](https://monumentmetals.com/elemetal-1oz-silver-round.html) | [Y](https://www.herobullion.com/1-oz-silver-round-any-mint-any-condition/) | — |

### Silver Bars (10 oz)

| Coin | APMEX | SD Bullion | Monument | Hero | Summit |
|------|-------|------------|----------|------|--------|
| **generic-silver-bar-10oz** | [Y](https://www.apmex.com/product/21/10-oz-silver-bar-secondary-market) | [Y](https://sdbullion.com/10-oz-sd-bullion-proclaim-liberty-silver-bar) | [Y](https://monumentmetals.com/10oz-elemetal-silver-bar.html) | [Y](https://www.herobullion.com/10-oz-silver-bar-any-mint-any-condition/) | — |

### Gold Coins (1 oz)

| Coin | APMEX | SD Bullion | Monument | Hero | Summit |
|------|-------|------------|----------|------|--------|
| **age** (American Gold Eagle) | [Y](https://www.apmex.com/product/1/1-oz-american-gold-eagle-coin-bu-random-year) | — | — | [Y](https://www.herobullion.com/american-gold-eagle-1-oz-coin/) | — |
| **buffalo** (Gold Buffalo) | [Y](https://www.apmex.com/product/39598/1-oz-gold-buffalo-bu-random-year) | [Y](https://sdbullion.com/1-oz-american-gold-buffalo-coin-random-year) | [Y](https://monumentmetals.com/random-date-1oz-gold-buffalo.html) | [Y](https://www.herobullion.com/american-gold-buffalo-1-oz-coin/) | — |
| **maple-gold** (Gold Maple Leaf) | [Y](https://www.apmex.com/product/9/canada-1-oz-gold-maple-leaf-9999-fine-bu-random-year) | [Y](https://sdbullion.com/1-oz-canadian-gold-maple-leaf-coin-random-year) | [Y](https://monumentmetals.com/random-date-1oz-gold-maple.html) | [Y](https://www.herobullion.com/canadian-gold-maple-1-oz-coin/) | — |
| **krugerrand-gold** (Gold Krugerrand) | [Y](https://www.apmex.com/product/62/south-african-1-oz-gold-krugerrand-coin-bu-random-year) | [Y](https://sdbullion.com/1-oz-south-african-gold-krugerrand-coin-random-year) | [Y](https://monumentmetals.com/random-date-1oz-gold-krugerrand.html) | [Y](https://www.herobullion.com/south-african-gold-krugerrand-1-oz-coin/) | — |

### Platinum Coins (1 oz)

| Coin | APMEX | SD Bullion | Monument | Hero | Summit |
|------|-------|------------|----------|------|--------|
| **ape** (American Platinum Eagle) | [Y](https://www.apmex.com/product/52/1-oz-american-platinum-eagle-coin-bu-random-year-1997-2023) | [Y](https://sdbullion.com/1-oz-platinum-american-eagle-coin-random-dates) | [Y](https://monumentmetals.com/random-date-1oz-platinum-eagle.html) | [Y](https://www.herobullion.com/american-platinum-eagle-1-oz-coin/) | — |

### Goldback Notes

| Coin | Weight | APMEX | Hero | Summit |
|------|--------|-------|------|--------|
| **goldback-oklahoma-g1** | 1 oz | [Y](https://www.apmex.com/product/314866/1-oklahoma-goldback-aurum-gold-foil-note-24k) | [Y](https://www.herobullion.com/1-oklahoma-goldback-aurum-gold-note/) | — |
| **goldback-utah-g50** | 50 oz | — | [Y](https://www.herobullion.com/50-utah-goldback-aurum-gold-note/) | — |
| **goldback-wyoming-g5** | 5 oz | Y (no URL) | — | — |
| **goldback-wyoming-g50** | 50 oz | [Y](https://www.apmex.com/product/255963/50-wyoming-goldback-aurum-gold-foil-note-24k) | — | — |

> **Issue:** `goldback-wyoming-g5` for APMEX has an empty URL — this target is enabled but will always fail.

---

## Disabled Vendors (in Turso for all coins)

| Vendor | Reason disabled | Hardcoded rules still present |
|--------|----------------|-------------------------------|
| `jmbullion` | Firecrawl unreliable (PLAYWRIGHT_ONLY); frequent OOS false positives | Yes — extraction strategy, cutoff patterns, header skip, fractional exempt, preorder tolerant |
| `bullionexchanges` | Cloudflare bot detection defeats both Firecrawl and Playwright | Yes — PLAYWRIGHT_ONLY, SLOW_PROVIDERS |
| `sdbullion` (gold coins only) | Disabled for gold — enabled for silver/platinum | Yes — cutoff patterns |

---

## Scraper Flow Per Target

```
For each enabled coin/vendor target:
  1. Is vendor in PLAYWRIGHT_ONLY_PROVIDERS?
     YES → skip to step 4
     NO  → step 2

  2. Phase 1: Firecrawl
     - POST to localhost:3002/v1/scrape
     - onlyMainContent: true (false for jmbullion)
     - waitFor: 6000ms if SLOW_PROVIDERS, else none
     - Retry up to 2x on failure
     - preprocessMarkdown() strips header/nav + tail sections
     - detectStockStatus() checks OOS patterns
     - extractPrice() tries per-vendor strategy
     - If price found → done
     - If OOS → done (no Playwright retry)
     - If no price + in stock → step 4

  3. Jitter 2-8s between targets

  4. Phase 2: Playwright (if Firecrawl failed or skipped)
     - Launch Chromium (PLAYWRIGHT_LAUNCH=1)
     - Block images/fonts/styles/media
     - Wait networkidle + 8s extra for SLOW_PROVIDERS
     - Proxy chain: direct → HOME_PROXY_URL_2 → PROXY_HTTP (on 403/geo-block)
     - Same preprocessMarkdown + detectStockStatus + extractPrice

  5. Record to Turso: price_snapshots + provider_failures (if failed)
```

---

## Keeping Pollers in Sync

### After any code change to `devops/fly-poller/`

1. **Fly.io:** `cd devops/fly-poller && fly deploy`
2. **Home poller:** Run the update script from [home-poller.md](home-poller.md#updating-poller-code)
3. **Verify hashes:**
   ```bash
   # Repo
   md5 -q devops/fly-poller/{price-extract,capture,provider-db,db,turso-client}.js
   # Home poller
   ssh -T homepoller 'md5sum /opt/poller/{price-extract,capture,provider-db,db,turso-client}.js'
   ```

### After `fly deploy` bumps Playwright version

```bash
ssh -T homepoller 'cd /opt/poller && sudo npm install playwright && sudo npx playwright install --with-deps chromium'
```

### Provider changes (URLs, enabled flags)

No deploy needed — both pollers read from Turso on every run. Use the dashboard at `http://192.168.1.81:3010/providers`.

---

## Parity Checklist

Run this after any deploy to verify both pollers are equivalent:

```bash
# 1. File hashes match
REPO=devops/fly-poller
for f in price-extract.js capture.js provider-db.js db.js turso-client.js run-home.sh; do
  LOCAL=$(md5 -q "$REPO/$f" 2>/dev/null)
  REMOTE=$(ssh -T homepoller "md5sum /opt/poller/$f 2>/dev/null" | awk '{print $1}')
  STATUS=$([[ "$LOCAL" == "$REMOTE" ]] && echo "OK" || echo "DRIFT")
  echo "$STATUS  $f  local=$LOCAL  remote=$REMOTE"
done

# 2. Both can reach Turso
ssh -T homepoller 'cd /opt/poller && set -a && source .env && set +a && node -e "
import { createTursoClient } from \"./turso-client.js\";
const c = createTursoClient();
const r = await c.execute(\"SELECT COUNT(*) as n FROM provider_vendors WHERE enabled = 1\");
console.log(\"Home poller: \" + r.rows[0].n + \" enabled vendors\");
"'
fly ssh console --app staktrakr -C "cd /app && node -e \"
import { createTursoClient } from './turso-client.js';
const c = createTursoClient();
const r = await c.execute('SELECT COUNT(*) as n FROM provider_vendors WHERE enabled = 1');
console.log('Fly.io: ' + r.rows[0].n + ' enabled vendors');
\""

# 3. Playwright version match
ssh -T homepoller 'node -e "import(\"playwright\").then(p=>console.log(\"Home:\",p.chromium.name()))"'
fly ssh console --app staktrakr -C "node -e \"import('playwright-core').then(p=>console.log('Fly:',p.chromium.name()))\""
```
