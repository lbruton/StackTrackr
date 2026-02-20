#!/usr/bin/env node
/**
 * StakTrakr Retail Poller — SQLite Helper
 * =========================================
 * Opens (or initialises) prices.db in the data repo root.
 * All public functions use better-sqlite3's synchronous API.
 *
 * DB location: path.join(DATA_DIR, '..', 'prices.db')
 *   → /data-repo/prices.db when DATA_DIR=/data-repo/data
 */

import Database from "better-sqlite3";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Window floor utility (shared by price-extract and api-export)
// ---------------------------------------------------------------------------

/**
 * Returns the ISO8601 UTC 15-minute floor for a timestamp.
 * e.g. 14:22:45 → "2026-02-20T14:15:00Z"
 */
export function windowFloor(ts = new Date()) {
  const d = new Date(ts);
  d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 15) * 15, 0, 0);
  return d.toISOString().replace(".000Z", "Z");
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS price_snapshots (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    scraped_at   TEXT NOT NULL,
    window_start TEXT NOT NULL,
    coin_slug    TEXT NOT NULL,
    vendor       TEXT NOT NULL,
    price        REAL,
    source       TEXT NOT NULL,
    confidence   INTEGER,
    is_failed    INTEGER NOT NULL DEFAULT 0
  );
`;

const CREATE_INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_coin_window ON price_snapshots(coin_slug, window_start);",
  "CREATE INDEX IF NOT EXISTS idx_window      ON price_snapshots(window_start);",
  "CREATE INDEX IF NOT EXISTS idx_coin_date   ON price_snapshots(coin_slug, substr(window_start, 1, 10));",
];

// ---------------------------------------------------------------------------
// Open / initialise
// ---------------------------------------------------------------------------

/**
 * Opens prices.db relative to dataDir (one level up).
 * Creates the table and indexes if they don't exist.
 *
 * @param {string} dataDir  Path to the data/ folder (process.env.DATA_DIR)
 * @returns {Database.Database}
 */
export function openDb(dataDir) {
  const dbPath = resolve(join(dataDir, "..", "prices.db"));
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(CREATE_TABLE);
  for (const idx of CREATE_INDEXES) {
    db.exec(idx);
  }
  return db;
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Insert a single price snapshot row.
 *
 * @param {Database.Database} db
 * @param {object} row
 * @param {string} row.scrapedAt    ISO8601 UTC timestamp of scrape
 * @param {string} row.windowStart  15-min floor ISO8601 UTC
 * @param {string} row.coinSlug
 * @param {string} row.vendor       provider id (e.g. "apmex")
 * @param {number|null} row.price   null if scrape failed
 * @param {string} row.source       "firecrawl" | "playwright" | "fbp"
 * @param {number|null} [row.confidence]  populated later by merge step
 * @param {boolean} [row.isFailed]  true if this scrape returned no price
 */
export function writeSnapshot(db, row) {
  const stmt = db.prepare(`
    INSERT INTO price_snapshots
      (scraped_at, window_start, coin_slug, vendor, price, source, confidence, is_failed)
    VALUES
      (@scrapedAt, @windowStart, @coinSlug, @vendor, @price, @source, @confidence, @isFailed)
  `);
  stmt.run({
    scrapedAt:   row.scrapedAt,
    windowStart: row.windowStart,
    coinSlug:    row.coinSlug,
    vendor:      row.vendor,
    price:       row.price ?? null,
    source:      row.source,
    confidence:  row.confidence ?? null,
    isFailed:    row.isFailed ? 1 : 0,
  });
}

/**
 * Write confidence scores back for all rows in a given window + coin.
 * Called by api-export.js during per-slug export.
 *
 * @param {Database.Database} db
 * @param {Array<{coinSlug: string, vendor: string, windowStart: string, confidence: number}>} scores
 */
export function writeConfidenceScores(db, scores) {
  const stmt = db.prepare(`
    UPDATE price_snapshots
    SET confidence = @confidence
    WHERE coin_slug = @coinSlug
      AND vendor    = @vendor
      AND window_start = @windowStart
  `);
  const updateMany = db.transaction((rows) => {
    for (const row of rows) {
      stmt.run(row);
    }
  });
  updateMany(scores);
}

/**
 * Returns all (coin_slug, vendor) pairs that failed today (is_failed = 1).
 * Used by PATCH_GAPS mode to find which vendors need FBP gap-fill.
 * @param {import('better-sqlite3').Database} db
 * @returns {Array<{coin_slug: string, vendor: string}>}
 */
export function readTodayFailures(db) {
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare(`
    SELECT coin_slug, vendor FROM price_snapshots
    WHERE is_failed = 1 AND substr(window_start, 1, 10) = ?
    GROUP BY coin_slug, vendor
    HAVING SUM(CASE WHEN is_failed = 0 THEN 1 ELSE 0 END) = 0
  `).all(today);
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Returns all price_snapshots rows for the given 15-minute window.
 *
 * @param {Database.Database} db
 * @param {string} windowStart  ISO8601 UTC 15-min floor
 * @returns {Array<object>}
 */
export function readWindow(db, windowStart) {
  return db
    .prepare("SELECT * FROM price_snapshots WHERE window_start = ? ORDER BY coin_slug, vendor")
    .all(windowStart);
}

/**
 * Returns per-window rows for a specific coin over the past N windows (chronological).
 * Used for building the 24h time series in api-export.
 *
 * @param {Database.Database} db
 * @param {string} coinSlug
 * @param {number} [windowCount=96]  default 96 = 24h worth of 15-min windows
 * @returns {Array<object>}
 */
export function readRecentWindows(db, coinSlug, windowCount = 96) {
  return db
    .prepare(`
      SELECT *
      FROM price_snapshots
      WHERE coin_slug = ? AND price IS NOT NULL
      ORDER BY window_start DESC
      LIMIT ?
    `)
    .all(coinSlug, windowCount * 20) // over-fetch then aggregate in JS
    .reverse();
}

/**
 * Returns daily aggregates for a coin over the past N days.
 * Each row: { date, avg_median, avg_low, sample_count, vendor_avgs (JSON string) }
 *
 * @param {Database.Database} db
 * @param {string} coinSlug
 * @param {number} [days=30]
 * @returns {Array<object>}
 */
export function readDailyAggregates(db, coinSlug, days = 30) {
  return db
    .prepare(`
      SELECT
        substr(window_start, 1, 10) AS date,
        COUNT(*)                    AS sample_count,
        AVG(price)                  AS avg_price,
        MIN(price)                  AS min_price,
        vendor
      FROM price_snapshots
      WHERE coin_slug   = ?
        AND price       IS NOT NULL
        AND substr(window_start, 1, 10) >= date('now', ? || ' days')
      GROUP BY date, vendor
      ORDER BY date ASC, vendor ASC
    `)
    .all(coinSlug, `-${days}`);
}

/**
 * Returns the most recent window_start that has at least one price row.
 *
 * @param {Database.Database} db
 * @returns {string|null}
 */
export function readLatestWindow(db) {
  const row = db
    .prepare("SELECT window_start FROM price_snapshots WHERE price IS NOT NULL ORDER BY window_start DESC LIMIT 1")
    .get();
  return row ? row.window_start : null;
}

/**
 * Returns all distinct coin slugs that have data in the DB.
 *
 * @param {Database.Database} db
 * @returns {string[]}
 */
export function readCoinSlugs(db) {
  return db
    .prepare("SELECT DISTINCT coin_slug FROM price_snapshots ORDER BY coin_slug")
    .all()
    .map((r) => r.coin_slug);
}

/**
 * Returns all rows for a given coin and window_start (for building per-vendor maps).
 *
 * @param {Database.Database} db
 * @param {string} coinSlug
 * @param {string} windowStart
 * @returns {Array<object>}
 */
export function readCoinWindow(db, coinSlug, windowStart) {
  return db
    .prepare("SELECT * FROM price_snapshots WHERE coin_slug = ? AND window_start = ?")
    .all(coinSlug, windowStart);
}

/**
 * Returns all distinct window_starts in descending order, up to limit.
 *
 * @param {Database.Database} db
 * @param {number} [limit=96]
 * @returns {string[]}
 */
export function readRecentWindowStarts(db, limit = 96) {
  return db
    .prepare("SELECT DISTINCT window_start FROM price_snapshots ORDER BY window_start DESC LIMIT ?")
    .all(limit)
    .map((r) => r.window_start)
    .reverse();
}
