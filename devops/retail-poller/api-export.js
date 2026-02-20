#!/usr/bin/env node
/**
 * StakTrakr Retail Poller — REST API JSON Exporter
 * ==================================================
 * Reads prices.db (SQLite) and writes static JSON endpoints to
 * DATA_DIR/api/. Called by run-local.sh after merge-prices.js.
 *
 * Output structure:
 *   data/api/
 *     manifest.json            ← coins list, last updated, window count
 *     latest.json              ← all coins, current 15-min window prices
 *     {slug}/
 *       latest.json            ← single coin: current prices + 96-window 24h series
 *       history-7d.json        ← daily aggregates, last 7 days
 *       history-30d.json       ← daily aggregates, last 30 days
 *
 * Usage:
 *   DATA_DIR=/path/to/data node api-export.js
 *
 * Environment:
 *   DATA_DIR   Path to repo data/ folder (default: ../../data)
 *   DRY_RUN    Set to "1" to skip writing files
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  openDb,
  readLatestWindow,
  readCoinSlugs,
  readCoinWindow,
  readRecentWindows,
  readRecentWindowStarts,
  readDailyAggregates,
} from "./db.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const DATA_DIR = resolve(process.env.DATA_DIR || join(__dirname, "../../data"));
const DRY_RUN = process.env.DRY_RUN === "1";

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
// File writer
// ---------------------------------------------------------------------------

function writeApiFile(relPath, data) {
  const filePath = join(DATA_DIR, "api", relPath);
  if (DRY_RUN) {
    log(`[DRY RUN] ${filePath}`);
    return;
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  log(`Wrote ${filePath}`);
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

/**
 * Compute median price from an array of price_snapshots rows.
 */
function medianPrice(rows) {
  const prices = rows.map((r) => r.price).filter((p) => p !== null && p !== undefined);
  if (!prices.length) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  return Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100;
}

/**
 * Compute lowest price from an array of rows.
 */
function lowestPrice(rows) {
  const prices = rows.map((r) => r.price).filter((p) => p !== null && p !== undefined);
  if (!prices.length) return null;
  return Math.round(Math.min(...prices) * 100) / 100;
}

/**
 * Build a vendor map { vendorId: { price, confidence, source } } from rows.
 */
function vendorMap(rows) {
  const map = {};
  for (const row of rows) {
    if (row.price !== null) {
      map[row.vendor] = {
        price:      Math.round(row.price * 100) / 100,
        confidence: row.confidence ?? null,
        source:     row.source,
      };
    }
  }
  return map;
}

/**
 * Aggregate window rows into {window, median, low} entries.
 * Groups by window_start, computes median and low price per window.
 */
function aggregateWindows(allRows) {
  const byWindow = new Map();
  for (const row of allRows) {
    if (row.price === null) continue;
    if (!byWindow.has(row.window_start)) byWindow.set(row.window_start, []);
    byWindow.get(row.window_start).push(row.price);
  }
  const result = [];
  for (const [window, prices] of byWindow) {
    const sorted = [...prices].sort((a, b) => a - b);
    result.push({
      window,
      median: Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100,
      low:    Math.round(sorted[0] * 100) / 100,
    });
  }
  return result.sort((a, b) => a.window.localeCompare(b.window));
}

/**
 * Aggregate daily rows (from readDailyAggregates) into per-date summaries.
 * Input rows have: { date, avg_price, min_price, sample_count, vendor }
 */
function aggregateDailyRows(rawRows) {
  const byDate = new Map();
  for (const row of rawRows) {
    if (!byDate.has(row.date)) {
      byDate.set(row.date, { date: row.date, prices: [], mins: [], sampleCount: 0, vendors: {} });
    }
    const entry = byDate.get(row.date);
    if (row.avg_price !== null) entry.prices.push(row.avg_price);
    if (row.min_price !== null)  entry.mins.push(row.min_price);
    entry.sampleCount += row.sample_count || 0;
    if (row.vendor && row.avg_price !== null) {
      entry.vendors[row.vendor] = { avg: Math.round(row.avg_price * 100) / 100 };
    }
  }
  const result = [];
  for (const [date, entry] of byDate) {
    const sorted = [...entry.prices].sort((a, b) => a - b);
    result.push({
      date,
      avg_median:   sorted.length ? Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100 : null,
      avg_low:      entry.mins.length ? Math.round(Math.min(...entry.mins) * 100) / 100 : null,
      sample_count: entry.sampleCount,
      vendors:      entry.vendors,
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dbPath = join(DATA_DIR, "..", "prices.db");
  if (!existsSync(dbPath)) {
    warn(`prices.db not found at ${dbPath} — nothing to export`);
    process.exit(0);
  }

  const db = openDb(DATA_DIR);
  const generatedAt = new Date().toISOString();

  try {

  // Determine the latest window and all coin slugs
  const latestWindow = readLatestWindow(db);
  if (!latestWindow) {
    warn("No price data in DB yet — skipping API export");
    return; // finally block closes db
  }

  // Read coin slugs from providers.json for complete coverage
  let coinSlugs = readCoinSlugs(db);
  const providersPath = join(DATA_DIR, "retail", "providers.json");
  if (existsSync(providersPath)) {
    try {
      const providersJson = JSON.parse(readFileSync(providersPath, "utf-8"));
      const allSlugs = Object.keys(providersJson.coins);
      // Merge: include any slug in providers.json even if not yet in DB
      coinSlugs = [...new Set([...allSlugs, ...coinSlugs])].sort();
    } catch {
      warn("Could not read providers.json — using slugs from DB only");
    }
  }

  log(`API export: ${coinSlugs.length} coins, latest window: ${latestWindow}`);

  // --------------------------------------------------------------------------
  // latest.json (global) — all coins at current window
  // --------------------------------------------------------------------------
  const globalLatestCoins = {};
  for (const slug of coinSlugs) {
    const rows = readCoinWindow(db, slug, latestWindow);
    if (!rows.length) continue;
    globalLatestCoins[slug] = {
      window_start:  latestWindow,
      median_price:  medianPrice(rows),
      lowest_price:  lowestPrice(rows),
      vendor_count:  Object.keys(vendorMap(rows)).length,
    };
  }

  writeApiFile("latest.json", {
    window_start:  latestWindow,
    generated_at:  generatedAt,
    coin_count:    Object.keys(globalLatestCoins).length,
    coins:         globalLatestCoins,
  });

  // --------------------------------------------------------------------------
  // Per-slug endpoints
  // --------------------------------------------------------------------------

  // Collect recent 96 windows for 24h time series
  const recentWindowStarts = readRecentWindowStarts(db, 96);
  const windowCount = recentWindowStarts.length;

  for (const slug of coinSlugs) {
    // latest.json per slug
    const latestRows = readCoinWindow(db, slug, latestWindow);
    const vendors = vendorMap(latestRows);

    // 24h windows time series — aggregate across all windows
    const recentRows = readRecentWindows(db, slug, 96);
    const windows24h = aggregateWindows(recentRows);

    writeApiFile(`${slug}/latest.json`, {
      slug,
      window_start:  latestWindow,
      median_price:  medianPrice(latestRows),
      lowest_price:  lowestPrice(latestRows),
      vendors,
      windows_24h:   windows24h,
    });

    // history-7d.json
    const raw7d = readDailyAggregates(db, slug, 7);
    const history7d = aggregateDailyRows(raw7d);
    writeApiFile(`${slug}/history-7d.json`, history7d);

    // history-30d.json
    const raw30d = readDailyAggregates(db, slug, 30);
    const history30d = aggregateDailyRows(raw30d);
    writeApiFile(`${slug}/history-30d.json`, history30d);
  }

  // --------------------------------------------------------------------------
  // manifest.json
  // --------------------------------------------------------------------------
  writeApiFile("manifest.json", {
    generated_at:   generatedAt,
    latest_window:  latestWindow,
    window_count:   windowCount,
    coin_count:     coinSlugs.length,
    coins:          coinSlugs,
    endpoints: {
      latest:      "api/latest.json",
      slug_latest: "api/{slug}/latest.json",
      history_7d:  "api/{slug}/history-7d.json",
      history_30d: "api/{slug}/history-30d.json",
    },
  });

  log(`API export complete: ${coinSlugs.length} coin(s), ${windowCount} window(s) in history`);

  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
