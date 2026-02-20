#!/usr/bin/env node
/**
 * StakTrakr Retail Price Extractor
 * ==================================
 * Reads providers.json, scrapes each dealer URL via Firecrawl,
 * extracts the lowest in-stock price, and writes daily JSON files
 * to data/retail/{coin-slug}/{YYYY-MM-DD}.json
 *
 * Usage:
 *   FIRECRAWL_API_KEY=fc-... node price-extract.js
 *
 * Environment:
 *   FIRECRAWL_API_KEY  Required. Firecrawl API key.
 *   DATA_DIR           Path to repo data/ folder (default: ../../data)
 *   COINS              Comma-separated coin slugs to run (default: all)
 *   DRY_RUN            Set to "1" to skip writing files
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
// Self-hosted Firecrawl: set FIRECRAWL_BASE_URL=http://localhost:3002
// Cloud Firecrawl (default): leave unset or set to https://api.firecrawl.dev
const FIRECRAWL_BASE_URL = (process.env.FIRECRAWL_BASE_URL || "https://api.firecrawl.dev").replace(/\/$/, "");
const DATA_DIR = resolve(process.env.DATA_DIR || join(__dirname, "../../data"));
const DRY_RUN = process.env.DRY_RUN === "1";
const COIN_FILTER = process.env.COINS ? process.env.COINS.split(",").map(s => s.trim()) : null;
// PATCH_GAPS: reads today's coin files, finds failed_sites, scrapes FBP only for
// those coins, and patches the existing daily JSON files with recovered prices.
// Run at 3pm ET after the 11am full scrape.
const PATCH_GAPS = process.env.PATCH_GAPS === "1";

// Firecrawl free/pay-as-you-go tier = 2 concurrent scrapes
const CONCURRENCY = 2;
const SCRAPE_TIMEOUT_MS = 30_000;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 3_000;

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function warn(msg) {
  console.warn(`[${new Date().toISOString().slice(11, 19)}] WARN: ${msg}`);
}

// ---------------------------------------------------------------------------
// Price extraction from Firecrawl markdown
// ---------------------------------------------------------------------------

// Per-oz price ranges by metal type.
// Multiplied by weight_oz to get the expected price range for each coin.
// Filters out accessories, spot ticker values, and unrelated products.
const METAL_PRICE_RANGE_PER_OZ = {
  silver:    { min: 40,   max: 200   },  // 1oz: $40-200, 10oz bar: $400-2000
  gold:      { min: 1500, max: 15000 },  // 1oz: $1500-15000
  platinum:  { min: 500,  max: 6000  },
  palladium: { min: 300,  max: 6000  },
};

// Provider IDs that use "As Low As" as their primary price indicator.
// For other providers (APMEX), the pricing table is more reliable.
const USES_AS_LOW_AS = new Set(["jmbullion", "monumentmetals", "sdbullion"]);

// Maps FBP table dealer names → our provider IDs.
// Only covers providers we track; unrecognized dealers are ignored.
const FBP_DEALER_NAME_MAP = {
  "JM Bullion":          "jmbullion",
  "APMEX":               "apmex",
  "SD Bullion":          "sdbullion",
  "Monument Metals":     "monumentmetals",
  "Hero Bullion":        "herobullion",
  "Bullion Exchanges":   "bullionexchanges",
  "Summit Metals":       "summitmetals",
  "Provident Metals":    "providentmetals",
  "BGASC":               "bgasc",
  "Money Metals Exchange": "moneymetals",
  "BullionStar US":      "bullionstar",
  "Silver.com":          "silverdotcom",
  "Bullion Standard":    "bullionstandard",
};

/**
 * Extract the lowest plausible per-coin price from scraped markdown.
 *
 * Strategy order varies by provider to avoid picking up related-product prices:
 *
 *  For APMEX (table-first):
 *    1. Lowest price in the main pricing table — avoids "As Low As" from
 *       related products (e.g. 1/2 oz AGE) that appear later in the page.
 *    2. "As Low As" fallback.
 *
 *  For JM Bullion, Monument Metals, SD Bullion (as-low-as-first):
 *    1. "As Low As $XX.XX" minimum in weight-adjusted range.
 *       Taking minimum handles JM pages that show roll totals ("As Low As
 *       $1,902") before per-coin price ("As Low As $93.81").
 *    2. Table fallback.
 *
 * All candidates are filtered by weight-adjusted price range to exclude
 * accessories, spot ticker values, and fractional coin prices.
 */
function extractPrice(markdown, metal, weightOz = 1, providerId = "") {
  if (!markdown) return null;

  const perOz = METAL_PRICE_RANGE_PER_OZ[metal] || { min: 5, max: 200_000 };
  const range = { min: perOz.min * weightOz, max: perOz.max * weightOz };

  function inRange(p) {
    return p >= range.min && p <= range.max;
  }

  function tablePrices() {
    const prices = [];
    let m;
    const pat = /\|\s*\*{0,2}\$?([\d,]+\.\d{2})\*{0,2}\s*\|/g;
    while ((m = pat.exec(markdown)) !== null) {
      const p = parseFloat(m[1].replace(/,/g, ""));
      if (inRange(p)) prices.push(p);
    }
    return prices;
  }

  function asLowAsPrices() {
    const prices = [];
    let m;
    const pat = /[Aa]s\s+[Ll]ow\s+[Aa]s[\s\\]*\$?([\d,]+\.\d{2})/g;
    while ((m = pat.exec(markdown)) !== null) {
      const p = parseFloat(m[1].replace(/,/g, ""));
      if (inRange(p)) prices.push(p);
    }
    return prices;
  }

  // Summit Metals and similar Shopify stores emit "Regular price $XX.XX" or "Sale price $XX.XX"
  function regularPricePrices() {
    const prices = [];
    let m;
    const pat = /(?:Regular|Sale)\s+price\s+\$?([\d,]+\.\d{2})/g;
    while ((m = pat.exec(markdown)) !== null) {
      const p = parseFloat(m[1].replace(/,/g, ""));
      if (inRange(p)) prices.push(p);
    }
    return prices;
  }

  if (providerId === "summitmetals") {
    const reg = regularPricePrices();
    if (reg.length > 0) return Math.min(...reg);
    const tbl = tablePrices();
    if (tbl.length > 0) return Math.min(...tbl);
    return null;
  }

  if (USES_AS_LOW_AS.has(providerId)) {
    // JM Bullion / Monument / SD: "As Low As" first, table as fallback
    const ala = asLowAsPrices();
    if (ala.length > 0) return Math.min(...ala);
    const tbl = tablePrices();
    if (tbl.length > 0) return Math.min(...tbl);
  } else {
    // APMEX and others: table first (avoids related-product "As Low As"),
    // fall back to "As Low As" if no table found
    const tbl = tablePrices();
    if (tbl.length > 0) return Math.min(...tbl);
    const ala = asLowAsPrices();
    if (ala.length > 0) return Math.min(...ala);
  }

  return null;
}

/**
 * Parse a FindBullionPrices comparison table.
 *
 * FBP table columns: Dealer | icons | ACH/Cash Price | Credit Price | Premium | Link
 * Returns { providerId -> { ach: number, credit: number } } for all recognized dealers.
 * ACH price is the wire/check price (lowest); credit price is the card price (~3-4% higher).
 */
function extractFbpPrices(markdown, metal, weightOz = 1) {
  if (!markdown) return {};

  const perOz = METAL_PRICE_RANGE_PER_OZ[metal] || { min: 5, max: 200_000 };
  const range = { min: perOz.min * weightOz, max: perOz.max * weightOz };

  const results = {};
  const lines = markdown.split("\n");

  for (const line of lines) {
    if (!line.startsWith("|") || line.startsWith("| ---") || line.startsWith("| **")) continue;

    // Extract dealer name from first cell (may contain markdown link)
    const firstCell = line.split("|")[1] || "";
    const nameMatch = firstCell.match(/\[([^\]]+)\]/) || firstCell.match(/([A-Z][^\[*\n]{2,40})/);
    if (!nameMatch) continue;
    const dealerName = nameMatch[1].trim();
    const providerId = FBP_DEALER_NAME_MAP[dealerName];
    if (!providerId) continue;

    // Extract all dollar amounts in range from the row; first = ACH, second = credit
    const prices = [];
    let m;
    const pat = /\$?([\d,]+\.\d{2})/g;
    while ((m = pat.exec(line)) !== null) {
      const p = parseFloat(m[1].replace(/,/g, ""));
      if (p >= range.min && p <= range.max) prices.push(p);
    }
    if (prices.length > 0) {
      results[providerId] = { ach: prices[0], credit: prices[1] ?? null };
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Firecrawl API
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Providers that need extra wait time to render prices (JS-heavy pages)
const SLOW_PROVIDERS = new Set(["jmbullion", "herobullion", "summitmetals"]);

async function scrapeUrl(url, providerId = "", attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  const body = {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
  };
  // JM Bullion is heavily JS-rendered; give it time to load prices
  if (SLOW_PROVIDERS.has(providerId)) {
    body.waitFor = 4000;
  }

  try {
    const response = await fetch(`${FIRECRAWL_BASE_URL}/v1/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(FIRECRAWL_API_KEY ? { "Authorization": `Bearer ${FIRECRAWL_API_KEY}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const json = await response.json();
    return json?.data?.markdown ?? null;

  } catch (err) {
    if (attempt < RETRY_ATTEMPTS) {
      warn(`Retry ${attempt}/${RETRY_ATTEMPTS} for ${url}: ${err.message}`);
      await sleep(RETRY_DELAY_MS * attempt);
      return scrapeUrl(url, providerId, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Concurrency pool
// ---------------------------------------------------------------------------

async function runConcurrent(tasks, concurrency) {
  const results = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// File writers
// ---------------------------------------------------------------------------

function writeDailyJson(coinSlug, dateStr, data) {
  const dir = join(DATA_DIR, "retail", coinSlug);
  const filePath = join(dir, `${dateStr}.json`);
  if (DRY_RUN) {
    log(`[DRY RUN] ${filePath}`);
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  log(`Wrote ${filePath}`);
}

function updateProviderCandidates(failures, dateStr) {
  if (failures.length === 0) return;
  const candidatesPath = join(DATA_DIR, "retail", "provider_candidates.json");
  let doc = { schema_version: 1, last_updated: dateStr, candidates: [] };

  if (existsSync(candidatesPath)) {
    try {
      doc = JSON.parse(readFileSync(candidatesPath, "utf-8"));
    } catch {
      warn("Could not parse provider_candidates.json, starting fresh");
    }
  }

  doc.last_updated = dateStr;
  for (const { coinSlug, providerId, url, error } of failures) {
    const key = `${coinSlug}/${providerId}`;
    const existing = doc.candidates.find(c => c.key === key);
    if (existing) {
      existing.consecutive_failures = (existing.consecutive_failures || 0) + 1;
      existing.last_error = error;
      existing.last_attempted = dateStr;
    } else {
      doc.candidates.push({
        key,
        coin: coinSlug,
        provider: providerId,
        url,
        consecutive_failures: 1,
        last_error: error,
        last_attempted: dateStr,
        last_working_date: null,
      });
    }
  }

  if (DRY_RUN) { log("[DRY RUN] Would update provider_candidates.json"); return; }
  writeFileSync(candidatesPath, JSON.stringify(doc, null, 2) + "\n");
  log(`Updated provider_candidates.json (${failures.length} failures logged)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isLocal = !FIRECRAWL_BASE_URL.includes("api.firecrawl.dev");
  if (!FIRECRAWL_API_KEY && !isLocal) {
    console.error("Error: FIRECRAWL_API_KEY is required for cloud Firecrawl.");
    console.error("For self-hosted: set FIRECRAWL_BASE_URL=http://localhost:3002");
    process.exit(1);
  }

  const providersPath = join(DATA_DIR, "retail", "providers.json");
  if (!existsSync(providersPath)) {
    console.error(`Error: providers.json not found at ${providersPath}`);
    process.exit(1);
  }

  const providersJson = JSON.parse(readFileSync(providersPath, "utf-8"));
  const dateStr = new Date().toISOString().slice(0, 10);
  const generatedAt = new Date().toISOString();

  // ---------------------------------------------------------------------------
  // PATCH_GAPS mode: 3pm ET follow-up run.
  // Reads today's coin files, finds any remaining failed_sites, scrapes FBP
  // only for those coins, and patches the existing daily JSON files in place.
  // ---------------------------------------------------------------------------
  if (PATCH_GAPS) {
    log(`Gap-fill run for ${dateStr}`);
    if (DRY_RUN) log("DRY RUN — no files written");

    // Find coins that still have failed_sites in today's output
    const gapsByCoin = {};
    for (const [coinSlug, coinData] of Object.entries(providersJson.coins)) {
      if (COIN_FILTER && !COIN_FILTER.includes(coinSlug)) continue;
      const filePath = join(DATA_DIR, "retail", coinSlug, `${dateStr}.json`);
      if (!existsSync(filePath)) continue;
      let daily;
      try { daily = JSON.parse(readFileSync(filePath, "utf-8")); } catch (err) { warn(`Skipping ${coinSlug}: could not parse ${filePath}: ${err.message}`); continue; }
      if (!daily.failed_sites?.length) continue;
      if (!coinData.fbp_url) continue;
      gapsByCoin[coinSlug] = { coinData, filePath, daily, gaps: daily.failed_sites };
    }

    const gapCoins = Object.keys(gapsByCoin);
    if (gapCoins.length === 0) {
      log("No gaps found — all providers succeeded at 11am. Nothing to do.");
      return;
    }
    log(`Gaps found in ${gapCoins.length} coin(s): ${gapCoins.join(", ")}`);

    let totalFilled = 0;
    for (const [coinSlug, { coinData, filePath, daily, gaps }] of Object.entries(gapsByCoin)) {
      log(`Scraping FBP for ${coinSlug} (gaps: ${gaps.join(", ")})`);
      try {
        const md = await scrapeUrl(coinData.fbp_url, "fbp");
        const fbpPrices = extractFbpPrices(md, coinData.metal, coinData.weight_oz || 1);

        let filled = 0;
        daily.prices_by_site = daily.prices_by_site || {};
        daily.extraction_methods = daily.extraction_methods || {};
        for (const providerId of gaps) {
          const fbp = fbpPrices[providerId];
          if (!fbp) continue;
          daily.prices_by_site[providerId] = fbp.ach;
          daily.extraction_methods[providerId] = "fbp_gap_fill";
          filled++;
          log(`  ↩ ${coinSlug}/${providerId}: $${fbp.ach.toFixed(2)} ACH (fbp_gap_fill)`);
        }

        if (filled > 0) {
          // Rebuild derived fields
          daily.failed_sites = gaps.filter(id => fbpPrices[id] === undefined);
          const prices = Object.values(daily.prices_by_site);
          const sorted = [...prices].sort((a, b) => a - b);
          daily.source_count = prices.length;
          daily.average_price = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100;
          daily.median_price = sorted[Math.floor(sorted.length / 2)];
          daily.lowest_price = sorted[0];

          if (DRY_RUN) {
            log(`[DRY RUN] Would patch ${filePath}`);
            console.log(JSON.stringify(daily, null, 2));
          } else {
            writeFileSync(filePath, JSON.stringify(daily, null, 2) + "\n");
            log(`Patched ${filePath} (${filled} gap(s) filled)`);
          }
          totalFilled += filled;
        } else {
          warn(`  FBP had no data for gaps in ${coinSlug}`);
        }
      } catch (err) {
        warn(`  ✗ FBP scrape failed for ${coinSlug}: ${err.message.slice(0, 120)}`);
      }
    }

    log(`Gap-fill done: ${totalFilled} price(s) recovered across ${gapCoins.length} coin(s)`);
    if (totalFilled === 0 && gapCoins.length > 0) {
      console.error("Gap-fill failed: all FBP scrapes failed, no prices recovered.");
      process.exit(1);
    }
    return;
  }

  // Build scrape targets
  const targets = [];
  for (const [coinSlug, coin] of Object.entries(providersJson.coins)) {
    if (COIN_FILTER && !COIN_FILTER.includes(coinSlug)) continue;
    for (const provider of coin.providers) {
      if (!provider.enabled || !provider.url) continue;
      targets.push({ coinSlug, coin, provider });
    }
  }

  log(`Retail price extraction: ${targets.length} targets, ${CONCURRENCY} concurrent`);
  if (DRY_RUN) log("DRY RUN — no files written");

  // Scrape all targets
  const scrapeResults = [];
  const tasks = targets.map(({ coinSlug, coin, provider }) => async () => {
    log(`Scraping ${coinSlug}/${provider.id}`);
    try {
      const markdown = await scrapeUrl(provider.url, provider.id);
      const price = extractPrice(markdown, coin.metal, coin.weight_oz || 1, provider.id);
      if (price !== null) {
        log(`  ✓ ${coinSlug}/${provider.id}: $${price.toFixed(2)}`);
      } else {
        warn(`  ? ${coinSlug}/${provider.id}: page loaded but no price found`);
      }
      scrapeResults.push({ coinSlug, coin, providerId: provider.id, url: provider.url, price, ok: price !== null, error: price === null ? "price_not_found" : null });
    } catch (err) {
      warn(`  ✗ ${coinSlug}/${provider.id}: ${err.message.slice(0, 120)}`);
      scrapeResults.push({ coinSlug, coin, providerId: provider.id, url: provider.url, price: null, ok: false, error: err.message.slice(0, 200) });
    }
  });

  await runConcurrent(tasks, CONCURRENCY);

  // FBP backfill: for each coin with failures that has a fbp_url, scrape once
  // and fill in any missing providers. Runs after primary scrapes complete.
  const coinSlugs = [...new Set(scrapeResults.map(r => r.coinSlug))];
  const fbpFillResults = {};  // coinSlug -> { providerId -> price }

  const coinsNeedingBackfill = coinSlugs.filter(coinSlug => {
    const failed = scrapeResults.filter(r => r.coinSlug === coinSlug && !r.ok);
    return failed.length > 0 && providersJson.coins[coinSlug]?.fbp_url;
  });

  if (coinsNeedingBackfill.length > 0) {
    log(`FBP backfill: ${coinsNeedingBackfill.length} coin(s) with failures`);
    for (const coinSlug of coinsNeedingBackfill) {
      const coinData = providersJson.coins[coinSlug];
      log(`  Scraping FBP for ${coinSlug}`);
      try {
        const fbpMd = await scrapeUrl(coinData.fbp_url, "fbp");
        const fbpPrices = extractFbpPrices(fbpMd, coinData.metal, coinData.weight_oz || 1);
        fbpFillResults[coinSlug] = fbpPrices;
        log(`  FBP ${coinSlug}: ${Object.keys(fbpPrices).length} dealer price(s) found`);
      } catch (err) {
        warn(`  FBP scrape failed for ${coinSlug}: ${err.message.slice(0, 120)}`);
      }
    }
  }

  // Aggregate per coin and write output
  const allFailures = [];

  for (const coinSlug of coinSlugs) {
    const coinResults = scrapeResults.filter(r => r.coinSlug === coinSlug);
    const successful = coinResults.filter(r => r.ok);
    const failed = coinResults.filter(r => !r.ok);

    const pricesBySite = {};
    const extractionMethods = {};
    const urlsUsed = [];
    for (const r of successful) {
      pricesBySite[r.providerId] = r.price;
      extractionMethods[r.providerId] = "firecrawl";
      urlsUsed.push(r.url);
    }

    // Apply FBP backfill for any providers that failed
    const fbpPrices = fbpFillResults[coinSlug] || {};
    for (const r of failed) {
      const fbp = fbpPrices[r.providerId];
      if (fbp !== undefined) {
        pricesBySite[r.providerId] = fbp.ach;
        extractionMethods[r.providerId] = "fbp_fallback";
        log(`  ↩ ${coinSlug}/${r.providerId}: $${fbp.ach.toFixed(2)} ACH (fbp_fallback)`);
      }
    }

    const prices = Object.values(pricesBySite);
    const sorted = [...prices].sort((a, b) => a - b);

    writeDailyJson(coinSlug, dateStr, {
      date: dateStr,
      generated_at_utc: generatedAt,
      currency: "USD",
      prices_by_site: pricesBySite,
      extraction_methods: extractionMethods,
      source_count: prices.length,
      average_price: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100 : null,
      median_price: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
      failed_sites: failed.filter(r => fbpPrices[r.providerId] === undefined).map(r => r.providerId),
      urls_used: urlsUsed,
    });

    for (const r of failed) {
      allFailures.push({ coinSlug, providerId: r.providerId, url: r.url, error: r.error });
    }
  }

  updateProviderCandidates(allFailures, dateStr);

  const ok = scrapeResults.filter(r => r.ok).length;
  const fail = scrapeResults.length - ok;
  log(`Done: ${ok}/${scrapeResults.length} prices captured, ${fail} failures`);

  if (ok === 0) {
    console.error("All scrapes failed.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
