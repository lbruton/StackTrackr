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
const DATA_DIR = resolve(process.env.DATA_DIR || join(__dirname, "../../data"));
const DRY_RUN = process.env.DRY_RUN === "1";
const COIN_FILTER = process.env.COINS ? process.env.COINS.split(",").map(s => s.trim()) : null;

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

// Plausible per-coin price ranges by metal type.
// Used to filter out accessories, roll totals, and spot ticker values.
const METAL_PRICE_RANGE = {
  silver:   { min: 50,   max: 500   },
  gold:     { min: 1500, max: 20000 },
  platinum: { min: 500,  max: 8000  },
  palladium: { min: 300, max: 8000  },
};

/**
 * Extract the lowest plausible per-coin price from scraped markdown.
 *
 * All candidate prices are filtered against the metal's expected range to
 * exclude accessories (capsules, tubes), bulk roll totals, and spot tickers.
 *
 * Strategy order:
 *  1. "As Low As $XX.XX" — JM Bullion, Monument Metals, SD Bullion
 *  2. First standalone dollar amount on its own line — APMEX
 *  3. Lowest plausible price in a markdown table column
 */
function extractPrice(markdown, metal) {
  if (!markdown) return null;

  const range = METAL_PRICE_RANGE[metal] || { min: 5, max: 200_000 };

  function inRange(p) {
    return p >= range.min && p <= range.max;
  }

  // Strategy 1: All "As Low As $XX.XX" occurrences filtered to coin range.
  // Taking the minimum of in-range matches handles pages that show both
  // per-coin ("As Low As $93.81") and roll totals ("As Low As $1,902").
  const asLowAsPattern = /[Aa]s\s+[Ll]ow\s+[Aa]s[\s\\]*\$?([\d,]+\.\d{2})/g;
  const asLowAsPrices = [];
  let m;
  while ((m = asLowAsPattern.exec(markdown)) !== null) {
    const p = parseFloat(m[1].replace(/,/g, ""));
    if (inRange(p)) asLowAsPrices.push(p);
  }
  if (asLowAsPrices.length > 0) return Math.min(...asLowAsPrices);

  // Strategy 2: Standalone dollar amount on its own line (APMEX top-of-page price)
  const lines = markdown.split("\n");
  for (const line of lines) {
    const standalone = line.trim().match(/^\$?([\d,]+\.\d{2})\$?\\?$/);
    if (standalone) {
      const p = parseFloat(standalone[1].replace(/,/g, ""));
      if (inRange(p)) return p;
    }
  }

  // Strategy 3: Plausible prices in markdown table cells
  const tablePrices = [];
  const tableCellPattern = /\|\s*\*{0,2}\$?([\d,]+\.\d{2})\*{0,2}\s*\|/g;
  while ((m = tableCellPattern.exec(markdown)) !== null) {
    const p = parseFloat(m[1].replace(/,/g, ""));
    if (inRange(p)) tablePrices.push(p);
  }
  if (tablePrices.length > 0) return Math.min(...tablePrices);

  return null;
}

// ---------------------------------------------------------------------------
// Firecrawl API
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function scrapeUrl(url, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
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
      return scrapeUrl(url, attempt + 1);
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
  if (!FIRECRAWL_API_KEY) {
    console.error("Error: FIRECRAWL_API_KEY is required.");
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
      const markdown = await scrapeUrl(provider.url);
      const price = extractPrice(markdown, coin.metal);
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

  // Aggregate per coin and write output
  const coinSlugs = [...new Set(scrapeResults.map(r => r.coinSlug))];
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
      failed_sites: failed.map(r => r.providerId),
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
