#!/usr/bin/env node
/**
 * StakTrakr Retail Price Extractor
 * ==================================
 * Reads providers.json, scrapes each dealer URL via Firecrawl (with a
 * Playwright/browserless fallback for JS-heavy pages), extracts the lowest
 * in-stock price, and records each result to SQLite.
 *
 * Usage:
 *   FIRECRAWL_API_KEY=fc-... node price-extract.js
 *
 * Environment:
 *   FIRECRAWL_API_KEY   Required for cloud Firecrawl. Omit for self-hosted.
 *   FIRECRAWL_BASE_URL  Self-hosted Firecrawl endpoint (default: api.firecrawl.dev)
 *   BROWSERLESS_URL     ws:// endpoint for Playwright fallback (optional)
 *   DATA_DIR            Path to repo data/ folder (default: ../../data)
 *   COINS               Comma-separated coin slugs to run (default: all)
 *   DRY_RUN             Set to "1" to skip writing files
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDb, writeSnapshot, windowFloor, readTodayFailures } from "./db.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
// Self-hosted Firecrawl: set FIRECRAWL_BASE_URL=http://localhost:3002
// Cloud Firecrawl (default): leave unset or set to https://api.firecrawl.dev
const FIRECRAWL_BASE_URL = (process.env.FIRECRAWL_BASE_URL || "https://api.firecrawl.dev").replace(/\/$/, "");
// Playwright/browserless fallback: ws:// endpoint for remote browser
// e.g. ws://host.docker.internal:3000/chromium/playwright?token=local_dev_token
const BROWSERLESS_URL = process.env.BROWSERLESS_URL || null;
const DATA_DIR = resolve(process.env.DATA_DIR || join(__dirname, "../../data"));
const DRY_RUN = process.env.DRY_RUN === "1";
const COIN_FILTER = process.env.COINS ? process.env.COINS.split(",").map(s => s.trim()) : null;
// PATCH_GAPS: queries SQLite for today's failed vendors, scrapes FBP only for
// those coins, and writes recovered prices back to SQLite.
// Run at 3pm ET after the 11am full scrape.
const PATCH_GAPS = process.env.PATCH_GAPS === "1";

// Sequential with per-request jitter (2-8s) — avoids rate-limit fingerprinting.
// Targets are shuffled so the same vendor is never hit consecutively;
// per-vendor effective gap ≈ (47/7 vendors) × avg_jitter ≈ ~30s — well within limits.
// Kept short so each full run completes in <10 min and fits inside the 15-min cron window.
const SCRAPE_TIMEOUT_MS = 30_000;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 3_000;

// Jitter between requests: 2–8 seconds (randomised anti-pattern fingerprinting)
function jitter() {
  return new Promise(r => setTimeout(r, 2_000 + Math.random() * 6_000));
}

// Fisher-Yates shuffle (in-place)
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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
const USES_AS_LOW_AS = new Set(["jmbullion", "monumentmetals"]);

const MARKDOWN_CUTOFF_PATTERNS = {
  sdbullion: [
    /^\*\*Add on Items\*\*/im,              // Firecrawl markdown bold header
    /^Add on Items\s*$/im,                  // Firecrawl plain-text header
    /^\*\*Customers Also Purchased\*\*/im,  // Firecrawl markdown bold header
    /^Customers Also Purchased\s*$/im,      // Firecrawl plain-text header
    /<[^>]*>\s*Add on Items/i,              // Playwright HTML header
    /<[^>]*>\s*Customers Also Purchased/i,  // Playwright HTML header
  ],
  // JM pages show "Similar Products You May Like" carousel with fractional coin
  // "As Low As" prices (1/2 oz, 1/4 oz, 1/10 oz) that fall within the metal
  // price range and cause Math.min() to pick a fractional price instead of 1oz.
  jmbullion: [
    /^Similar Products You May Like/im,    // Firecrawl markdown section heading
    /<[^>]*>\s*Similar Products You May Like/i, // Playwright HTML heading
  ],
};

function preprocessMarkdown(markdown, providerId) {
  const patterns = MARKDOWN_CUTOFF_PATTERNS[providerId];
  if (!patterns || !markdown) return markdown ?? "";
  let cutIndex = markdown.length;
  for (const pattern of patterns) {
    const match = markdown.search(pattern);
    if (match !== -1 && match < cutIndex) cutIndex = match;
  }
  return markdown.slice(0, cutIndex);
}


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
 *  For JM Bullion, Monument Metals (as-low-as-first):
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

  // Returns the Check/Wire (leftmost) price from the first data row of a markdown
  // pricing table. Pricing tables list tiers smallest-first (1-unit → bulk) with
  // columns: Check/Wire | Crypto | Card. Taking prices[0] from the first matching
  // row gives the 1-unit ACH price — the fairest cross-vendor comparison point.
  function firstTableRowFirstPrice() {
    const lines = markdown.split("\n");
    for (const line of lines) {
      if (!line.startsWith("|")) continue;
      if (/^\|\s*[-:]+/.test(line)) continue; // skip separator rows
      const prices = [];
      for (const m of line.matchAll(/\|\s*\*{0,2}\$?([\d,]+\.\d{2})\*{0,2}\s*(?:\|)/g)) {
        const p = parseFloat(m[1].replace(/,/g, ""));
        if (inRange(p)) prices.push(p);
      }
      if (prices.length > 0) return prices[0];
    }
    return null;
  }

  // Fallback for SPAs (e.g. Bullion Exchanges) that render prices as prose rather
  // than markdown pipe tables. Returns the first $XX.XX value in the metal range.
  function firstInRangePriceProse() {
    for (const m of markdown.matchAll(/\$\s*([\d,]+\.\d{2})/g)) {
      const p = parseFloat(m[1].replace(/,/g, ""));
      if (inRange(p)) return p;
    }
    return null;
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
    // APMEX, SDB, Hero Bullion, Bullion Exchanges, etc.
    // Tables have columns: Check/Wire | Crypto | Card; rows: 1-unit → bulk.
    // firstTableRowFirstPrice() returns the 1-unit Check/Wire (ACH) price.
    // firstInRangePriceProse() handles SPAs (e.g. Bullion Exchanges) that
    // render the price grid as prose rather than markdown pipe tables.
    const tblFirst = firstTableRowFirstPrice();
    if (tblFirst !== null) return tblFirst;
    const prose = firstInRangePriceProse();
    if (prose !== null) return prose;
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

// Providers that need extra wait time to render prices (JS-heavy SPAs).
// jmbullion/herobullion: Next.js/React, needs ~5s to populate price tables.
// monumentmetals: full SPA (React Native Web), router doesn't mount until ~6s.
// bullionexchanges: React/Magento SPA, pricing grid doesn't render until ~6-8s.
const SLOW_PROVIDERS = new Set(["jmbullion", "herobullion", "monumentmetals", "summitmetals", "bullionexchanges"]);

async function scrapeUrl(url, providerId = "", attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  const body = {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
  };
  // JS-heavy SPAs need time to mount and render prices; 6s covers all slow providers
  if (SLOW_PROVIDERS.has(providerId)) {
    body.waitFor = 6000;
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
// Playwright fallback (browserless remote browser)
// ---------------------------------------------------------------------------

/**
 * Scrape a URL using a remote Playwright/browserless instance.
 * Called when Firecrawl returns null or throws for a target.
 * Returns the HTML content as a string (to be passed through extractPrice).
 *
 * @param {string} url
 * @param {string} [providerId]
 * @returns {Promise<string|null>}  raw HTML/text content, or null on failure
 */
async function scrapeWithPlaywright(url, providerId = "") {
  if (!BROWSERLESS_URL) return null;

  let browser;
  try {
    // Dynamic import so the module is only loaded when needed
    const { chromium } = await import("playwright-core");
    browser = await chromium.connect(BROWSERLESS_URL);
    const page = await browser.newPage();
    // Spoof a realistic user-agent to reduce bot detection
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
    await page.goto(url, { waitUntil: "networkidle", timeout: SCRAPE_TIMEOUT_MS });
    // Extra wait for JS-heavy SPAs (Monument Metals, JM Bullion, Hero Bullion)
    if (SLOW_PROVIDERS.has(providerId)) {
      await page.waitForTimeout(6_000);
    }
    const content = await page.content();
    await browser.close();
    return content;
  } catch (err) {
    warn(`Playwright fallback failed for ${url}: ${err.message.slice(0, 120)}`);
    if (browser) {
      try { await browser.close(); } catch { /* ignore close error */ }
    }
    return null;
  }
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

  if (PATCH_GAPS) {
    log(`Gap-fill run for ${dateStr}`);
    if (DRY_RUN) log("DRY RUN — no SQLite writes");

    const gapDb = DRY_RUN ? null : openDb(DATA_DIR);
    try {
      // Query SQLite for failed vendors today
      const failures = DRY_RUN ? [] : readTodayFailures(gapDb);
      if (failures.length === 0) {
        log("No gaps found — all vendors succeeded today. Nothing to do.");
        return;
      }

      // Group by coin slug
      const gapsByCoin = {};
      for (const { coin_slug, vendor } of failures) {
        if (!gapsByCoin[coin_slug]) gapsByCoin[coin_slug] = [];
        gapsByCoin[coin_slug].push(vendor);
      }

      const gapCoins = Object.keys(gapsByCoin);
      log(`Gaps found in ${gapCoins.length} coin(s): ${gapCoins.join(", ")}`);

      let totalFilled = 0;
      const scrapedAt = new Date().toISOString();
      const winStart = windowFloor();

      for (const [coinSlug, vendors] of Object.entries(gapsByCoin)) {
        if (COIN_FILTER && !COIN_FILTER.includes(coinSlug)) continue;
        const coinData = providersJson.coins[coinSlug];
        if (!coinData?.fbp_url) { warn(`No fbp_url for ${coinSlug} — skipping`); continue; }
        log(`Scraping FBP for ${coinSlug} (gaps: ${vendors.join(", ")})`);
        try {
          const md = await scrapeUrl(coinData.fbp_url, "fbp");
          const fbpPrices = extractFbpPrices(md, coinData.metal, coinData.weight_oz || 1);

          for (const providerId of vendors) {
            const fbp = fbpPrices[providerId];
            if (!fbp) { warn(`  FBP had no data for ${coinSlug}/${providerId}`); continue; }
            const price = fbp.ach;
            log(`  \u21a9 ${coinSlug}/${providerId}: $${price.toFixed(2)} ACH (fbp)`);
            if (!DRY_RUN) {
              writeSnapshot(gapDb, { scrapedAt, windowStart: winStart, coinSlug, vendor: providerId, price, source: "fbp", isFailed: 0 });
            }
            totalFilled++;
          }
        } catch (err) {
          warn(`  \u2717 FBP scrape failed for ${coinSlug}: ${err.message.slice(0, 120)}`);
        }
      }

      log(`Gap-fill done: ${totalFilled} price(s) recovered`);
      if (totalFilled === 0 && gapCoins.length > 0) {
        throw new Error("Gap-fill failed: no prices recovered from FBP.");
      }
    } finally {
      if (gapDb) gapDb.close();
    }
    return;
  }

  // Build scrape targets — shuffled to avoid rate-limit fingerprinting
  const targets = [];
  for (const [coinSlug, coin] of Object.entries(providersJson.coins)) {
    if (COIN_FILTER && !COIN_FILTER.includes(coinSlug)) continue;
    for (const provider of coin.providers) {
      if (!provider.enabled || !provider.url) continue;
      targets.push({ coinSlug, coin, provider });
    }
  }
  shuffleArray(targets);

  log(`Retail price extraction: ${targets.length} targets (sequential + jitter)`);
  if (DRY_RUN) log("DRY RUN — no SQLite writes");

  // Open SQLite for this run — closed in finally block to ensure cleanup on fatal errors
  const db = DRY_RUN ? null : openDb(DATA_DIR);
  const scrapedAt = new Date().toISOString();
  const winStart = windowFloor();

  try {

  // Scrape all targets sequentially with per-request jitter
  const scrapeResults = [];
  for (let targetIdx = 0; targetIdx < targets.length; targetIdx++) {
    const { coinSlug, coin, provider } = targets[targetIdx];
    log(`Scraping ${coinSlug}/${provider.id}`);
    let price = null;
    let source = "firecrawl";

    try {
      const markdown = await scrapeUrl(provider.url, provider.id);
      const cleanedMarkdown = preprocessMarkdown(markdown, provider.id);
      price = extractPrice(cleanedMarkdown, coin.metal, coin.weight_oz || 1, provider.id);

      // Playwright fallback: if Firecrawl returned a page but no price was found
      if (price === null && BROWSERLESS_URL) {
        log(`  ? ${coinSlug}/${provider.id}: no price via Firecrawl — trying Playwright`);
        const html = await scrapeWithPlaywright(provider.url, provider.id);
        if (html) {
          // extractPrice works on HTML too — regex patterns match dollar amounts in either format
          const cleanedHtml = preprocessMarkdown(html, provider.id);
          price = extractPrice(cleanedHtml, coin.metal, coin.weight_oz || 1, provider.id);
          if (price !== null) {
            source = "playwright";
            log(`  ✓ ${coinSlug}/${provider.id}: $${price.toFixed(2)} (playwright)`);
          } else {
            warn(`  ? ${coinSlug}/${provider.id}: Playwright page loaded but no price found`);
          }
        }
      } else if (price !== null) {
        log(`  ✓ ${coinSlug}/${provider.id}: $${price.toFixed(2)}`);
      } else {
        warn(`  ? ${coinSlug}/${provider.id}: page loaded but no price found`);
      }

      scrapeResults.push({ coinSlug, coin, providerId: provider.id, url: provider.url, price, source, ok: price !== null, error: price === null ? "price_not_found" : null });
    } catch (err) {
      // Firecrawl threw — try Playwright before giving up
      if (BROWSERLESS_URL) {
        log(`  ✗ Firecrawl threw for ${coinSlug}/${provider.id} — trying Playwright`);
        try {
          const html = await scrapeWithPlaywright(provider.url, provider.id);
          if (html) {
            const cleanedHtml = preprocessMarkdown(html, provider.id);
            price = extractPrice(cleanedHtml, coin.metal, coin.weight_oz || 1, provider.id);
            if (price !== null) {
              source = "playwright";
              log(`  ✓ ${coinSlug}/${provider.id}: $${price.toFixed(2)} (playwright)`);
            }
          }
        } catch (pwErr) {
          warn(`  ✗ Playwright also failed for ${coinSlug}/${provider.id}: ${pwErr.message.slice(0, 80)}`);
        }
      }

      if (price === null) {
        warn(`  ✗ ${coinSlug}/${provider.id}: ${err.message.slice(0, 120)}`);
      }
      scrapeResults.push({ coinSlug, coin, providerId: provider.id, url: provider.url, price, source, ok: price !== null, error: price === null ? err.message.slice(0, 200) : null });
    }

    // Record to SQLite
    if (db) {
      writeSnapshot(db, {
        scrapedAt,
        windowStart: winStart,
        coinSlug,
        vendor:    provider.id,
        price,
        source,
        isFailed:  price === null,
      });
    }

    // Jitter before next request (skip after last target)
    if (targetIdx < targets.length - 1) {
      await jitter();
    }
  }

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

  // Aggregate per coin and apply FBP backfill
  for (const coinSlug of coinSlugs) {
    const coinResults = scrapeResults.filter(r => r.coinSlug === coinSlug);
    const failed = coinResults.filter(r => !r.ok);

    // Apply FBP backfill for any providers that failed
    const fbpPrices = fbpFillResults[coinSlug] || {};
    for (const r of failed) {
      const fbp = fbpPrices[r.providerId];
      if (fbp !== undefined) {
        log(`  ↩ ${coinSlug}/${r.providerId}: $${fbp.ach.toFixed(2)} ACH (fbp_fallback)`);
        // Record FBP fallback result to SQLite
        if (db) {
          writeSnapshot(db, {
            scrapedAt,
            windowStart: winStart,
            coinSlug,
            vendor:   r.providerId,
            price:    fbp.ach,
            source:   "fbp",
            isFailed: false,
          });
        }
      }
    }
  }

  const ok = scrapeResults.filter(r => r.ok).length;
  const fail = scrapeResults.length - ok;
  log(`Done: ${ok}/${scrapeResults.length} prices captured, ${fail} failures`);

  if (ok === 0) {
    console.error("All scrapes failed.");
    process.exit(1);
  }

  } finally {
    if (db) db.close();
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
