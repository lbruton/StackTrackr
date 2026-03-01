---
title: "Vendor Scraping Quirks"
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.18
date: 2026-03-01
sourceFiles: []
relatedPages: []
---

# Vendor Scraping Quirks

Per-vendor scraping behavior, known issues, and workarounds. This is the runbook for diagnosing price extraction failures — check here first before modifying `price-extract.js`.

> **Linear**: STAK-348 — planned sprint to move all vendor-specific config into the dashboard (editable per-vendor `hints` JSON).

---

## APMEX

| Property | Value |
|----------|-------|
| Site tech | Server-rendered HTML |
| Firecrawl | Works reliably, no `waitFor` needed |
| Playwright fallback | Rarely needed |
| Price format | Markdown pipe table (Check/Wire \| Crypto \| Card columns) |
| Extraction | `firstTableRowFirstPrice()` — 1-unit ACH price from first data row |
| Known issues | None — most reliable vendor |

**OOS detection**: Standard patterns work. No false positives observed.

---

## JM Bullion

| Property | Value |
|----------|-------|
| Site tech | Next.js / React SPA |
| Firecrawl | Requires `waitFor: 8000` (in `SLOW_PROVIDERS`) |
| Playwright fallback | Raw `chromium.launch()` gets **403 Forbidden** (bot detection) |
| Price format | Mix of pipe tables (silver) and prose tables (gold) |
| Extraction | `firstTableRowFirstPrice()` → `jmPriceFromProseTable()` → `asLowAsPrices()` |
| Sets | `SLOW_PROVIDERS`, `FRACTIONAL_EXEMPT_PROVIDERS` |

**Critical quirks:**

1. **Bot detection on headless Chromium**: JMBullion returns HTTP 403 to raw Playwright. The Firecrawl Playwright Service (port 3003) has stealth patches that bypass this. Always use Firecrawl Phase 1, never skip to raw Playwright.

2. **Fractional nav links**: Mega-menu always includes "1/2 oz Gold Eagle", "1/4 oz Gold Eagle" links regardless of product page. Must be in `FRACTIONAL_EXEMPT_PROVIDERS` or fractional_weight detection fires on nav text.

3. **Prose pricing table (gold pages)**: Gold product pages render pricing as plain text, not markdown pipe tables:
   ```
   (e)Check/Wire
   1-9
   $5,446.39
   ```
   Handled by `jmPriceFromProseTable()`. Silver pages use standard pipe tables.

4. **`onlyMainContent: false`**: JMBullion's React shell returns empty markdown with `onlyMainContent: true`. Disabled specifically for this vendor (line 448).

5. **Preorder tolerance**: In `PREORDER_TOLERANT_PROVIDERS` — JMBullion marks some items as "Pre-Order" with valid purchasable prices. The `pre-?order` OOS pattern is skipped for this vendor.

**If JMBullion starts failing**: Check that Firecrawl Phase 1 is running (not skipped by `PLAYWRIGHT_ONLY_PROVIDERS`). Check that `waitFor` is >= 8000ms. Check Playwright Service health: `curl http://localhost:3003/health`.

---

## Bullion Exchanges

| Property | Value |
|----------|-------|
| Site tech | React / Magento SPA + Cloudflare |
| Firecrawl | Requires `waitFor: 8000` (in `SLOW_PROVIDERS`) |
| Playwright fallback | Raw `chromium.launch()` gets **Cloudflare challenge** (403) |
| Price format | Prose (no pipe tables) — "As Low As $X.XX Over Spot" |
| Extraction | `firstTableRowFirstPrice()` → `firstInRangePriceProse()` → `asLowAsPrices()` |
| Sets | `SLOW_PROVIDERS`, `FRACTIONAL_EXEMPT_PROVIDERS` |

**Critical quirks:**

1. **Cloudflare bot detection**: Like JMBullion, raw headless Chromium is blocked. Must go through Firecrawl (which uses the Playwright Service with stealth). Never skip Firecrawl Phase 1.

2. **SPA rendering**: Without `waitFor`, Firecrawl returns only a banner image (~40 bytes of markdown). Needs 6-8 seconds for React to mount and render pricing grid.

3. **Fractional related products**: Product pages include a "Related Products" carousel with fractional variants ("1/2 oz Platinum American Eagle"). Must be in `FRACTIONAL_EXEMPT_PROVIDERS`.

4. **Price format**: No pipe tables. Prices appear as prose: `$96.37` inline. Extracted by `firstInRangePriceProse()` — returns first dollar amount in the metal's expected range.

5. **Legitimate OOS items**: Some items genuinely go out of stock (e.g., 1oz Platinum American Eagle as of 2026-02). Shows "Out Of Stock" + "NOTIFY ME" button. This is real, not a false positive.

**If Bullion Exchanges starts failing**: Check Firecrawl Phase 1 is running. Check `waitFor >= 8000`. Verify Cloudflare isn't blocking the Playwright Service IP (check `curl http://localhost:3003/health`).

---

## Monument Metals

| Property | Value |
|----------|-------|
| Site tech | Full SPA (React Native Web / Magento) |
| Firecrawl | Requires `waitFor: 8000` (in `SLOW_PROVIDERS`) |
| Playwright fallback | Works on Fly.io (via proxy chain), **blocked on home poller** without proxy |
| Price format | "As Low As $X.XX" — no pricing table |
| Extraction | `firstTableRowFirstPrice()` → `firstInRangePriceProse()` → `asLowAsPrices()` |
| Sets | `SLOW_PROVIDERS` |

**Critical quirks:**

1. **False OOS from review text**: Customer reviews on product pages contain casual "notify me" text (e.g., "notify me when you ship"). The broad `/notify\s+me/i` OOS pattern matched this — **removed in 2026-02-26 fix**. The specific `/notify me when available/i` pattern (line 122) still catches real "Notify Me When Available" buttons.

2. **SPA mount delay**: React Native Web router doesn't mount until ~6-8 seconds. Without `waitFor`, Firecrawl gets the shell (nav bar, spot tickers) but no product content.

3. **Proxy dependency for Playwright**: On Fly.io, direct Playwright gets 403. Falls back through proxy chain (`HOME_PROXY_URL_2` → Webshare). On home poller, raw Playwright also gets 403 with no proxy chain to fall back on. Fix: use Firecrawl Phase 1 (which routes through Playwright Service with stealth).

4. **"As Low As" is bulk pricing**: Monument shows "As Low As" for 500+ unit purchases. The real 1-unit price is in a pipe table (`1-24` row, `eCheck/Wire` column). Extraction uses table-first strategy (updated 2026-02-21).

---

## Hero Bullion

| Property | Value |
|----------|-------|
| Site tech | Next.js / React |
| Firecrawl | Requires `waitFor: 8000` (in `SLOW_PROVIDERS`) |
| Playwright fallback | Generally works |
| Price format | Markdown pipe table |
| Extraction | Standard table-first |
| Sets | `SLOW_PROVIDERS` |

**Known issues:**

1. **Occasional OOS**: Some items (e.g., `ape` — American Platinum Eagle) go legitimately OOS. Verify via Chrome DevTools before investigating code.

2. **Slow render**: Like JMBullion, needs 5-6s for price table to populate.

---

## SD Bullion

| Property | Value |
|----------|-------|
| Site tech | Server-rendered with some JS |
| Firecrawl | Works reliably |
| Playwright fallback | Rarely needed |
| Price format | Markdown pipe table |
| Extraction | Standard table-first |

**Known issues:**

1. **Markdown cutoff needed**: Page includes "Add on Items" and "Customers Also Purchased" sections with prices from other products. `MARKDOWN_CUTOFF_PATTERNS` truncates markdown before these sections to prevent cross-contamination.

---

## Summit Metals

| Property | Value |
|----------|-------|
| Site tech | Shopify |
| Firecrawl | Requires `waitFor: 8000` (in `SLOW_PROVIDERS`) |
| Price format | "Regular price $XX.XX" / "Sale price $XX.XX" |
| Extraction | `regularPricePrices()` → `tablePrices()` |
| Sets | `SLOW_PROVIDERS` |

**Known issues:**

1. **Shopify price format**: Uses "Regular price" / "Sale price" labels instead of tables or "As Low As". Dedicated `regularPricePrices()` extractor handles this.

---

## Goldback (goldback.com)

| Property | Value |
|----------|-------|
| Site tech | Custom (exchange rate page) |
| Firecrawl | Works but price is on a shared exchange-rate page |
| Price format | Exchange rate table — not standard product page |
| Extraction | Separate pipeline (`goldback-pipeline`) |

**Known issues:**

1. **Single URL for all denominations**: All goldback coins (G1, G2, G5, G10, G25, G50) use the same URL (`/exchange-rate/`). Price extraction must parse the correct denomination row.

2. **Separate pipeline**: Goldback prices are handled by the dedicated goldback pipeline, not the retail poller. Failures here are separate from the main failure queue.

---

## Debugging Playbook

### Vendor shows `price_not_found`

1. **Check the URL**: Open it in Chrome DevTools — is the product actually there? Does it show a price?
2. **Check Firecrawl output**: `curl -s http://localhost:3002/v1/scrape -H 'Content-Type: application/json' -d '{"url":"<URL>","formats":["markdown"],"waitFor":8000}'` — is the markdown complete or truncated?
3. **Check price range**: Is the price within `METAL_PRICE_RANGE_PER_OZ[metal] * weight_oz`?
   - Silver: $40–$200/oz
   - Gold: $1,500–$15,000/oz
   - Platinum: $500–$6,000/oz
4. **Check extraction strategy**: Which `extractPrice()` path does this vendor take? Table-first, prose, or "As Low As"?

### Vendor shows OOS but page is in stock

1. **Check `OUT_OF_STOCK_PATTERNS`**: Which pattern matched? Run the page markdown through each regex.
2. **Check review/footer text**: Customer reviews and footer text can contain OOS keywords casually.
3. **Check `PREORDER_TOLERANT_PROVIDERS`**: Is "Pre-Order" being treated as OOS for a vendor that sells preorders?

### Playwright Phase 2 gets 403

1. **Check if Firecrawl Phase 1 ran**: Is the vendor in `PLAYWRIGHT_ONLY_PROVIDERS`? It shouldn't be — all vendors should go through Firecrawl first.
2. **Check Playwright Service**: `curl http://localhost:3003/health` — the Playwright Service has stealth; raw `chromium.launch()` does not.
3. **Check proxy chain**: `WEBSHARE_PROXY_USER` set? `HOME_PROXY_URL_2` set? Both empty = no fallback.

### Total count drops unexpectedly

1. **Check provider database**: `SELECT count(*) FROM provider_vendors WHERE enabled=1` — did someone disable items?
2. **Check dashboard Failure Queue**: Items with 3+ failures get flagged.
3. **Check for container restarts**: `fly logs --app staktrakr | grep -i restart` — Fly.io may have restarted.

---

## Configuration Reference

| Set | Purpose | Current members |
|-----|---------|-----------------|
| `SLOW_PROVIDERS` | `waitFor: 8000` for Firecrawl | jmbullion, herobullion, monumentmetals, summitmetals, bullionexchanges |
| `PLAYWRIGHT_ONLY_PROVIDERS` | Skip Firecrawl Phase 1 | **Empty** (as of 2026-02-26) |
| `PREORDER_TOLERANT_PROVIDERS` | Skip `pre-?order` OOS pattern | jmbullion |
| `FRACTIONAL_EXEMPT_PROVIDERS` | Skip fractional weight check | jmbullion, bullionexchanges |
| `MARKDOWN_CUTOFF_PATTERNS` | Truncate markdown before noise | sdbullion, jmbullion |
| `MARKDOWN_HEADER_SKIP_PATTERNS` | Skip misleading headers | jmbullion |

## Incident Log

| Date | Issue | Root cause | Fix |
|------|-------|-----------|-----|
| 2026-02-26 | Monument Metals all OOS on home | `/notify\s+me/i` matched review text | Removed broad pattern; specific `/notify me when available/i` suffices |
| 2026-02-26 | JMBullion/BE `price_not_found` on home | `PLAYWRIGHT_ONLY_PROVIDERS` skipped Firecrawl → raw Playwright 403'd | Emptied set; all vendors use Firecrawl Phase 1 now |
| 2026-02-26 | Home poller 11/47 failures | Combination of above two issues | Both fixes deployed |
| 2026-02-26 | API poller orphaned at 22:10 | Process crash (600ms+ latency spike) | Self-recovered on next cron |
