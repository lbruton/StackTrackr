# Turso Multi-Poller Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Migrate retail-poller from local SQLite to Turso cloud database, eliminate git-based database corruption, and enable 3-poller distributed architecture with 5-minute data cadence.

**Architecture:** Replace better-sqlite3 with @libsql/client for Turso connectivity. Replace staktrakr-data repo with StakTrakrApi repo (separate branches per poller). Add merge job to combine api1/api2/api3 branches into main every 5 minutes.

**Tech Stack:** Turso libSQL, @libsql/client, Fly.io, bash scripts (merge job), Infisical (secrets)

---

## Prerequisites

**Before starting implementation:**

1. **Turso Database Created** - User has created Turso database via Turso CLI or web UI
2. **Credentials in Infisical** - TURSO_DATABASE_URL and TURSO_AUTH_TOKEN stored in Infisical
3. **GitHub Token** - Personal access token with write access to StakTrakrApi repo
4. **StakTrakrApi Repo Exists** - `https://github.com/lbruton/StakTrakrApi.git` already created

---

## Task 1: Add Turso Client Dependency

**Files:**
- Modify: `devops/retail-poller/package.json`

**Implementation:**

Add `@libsql/client` dependency while keeping `better-sqlite3` for local SQLite snapshot exports.

```json
{
  "dependencies": {
    "@libsql/client": "^0.14.0",
    "better-sqlite3": "^11.0.0",
    "dotenv": "^16.4.0",
    "playwright-core": "^1.49.0"
  }
}
```

**Verification:**

```bash
cd devops/retail-poller
npm install
npm list @libsql/client
```

Expected: `@libsql/client@0.14.0`

**Commit:**

```bash
git add devops/retail-poller/package.json devops/retail-poller/package-lock.json
git commit -m "feat(retail-poller): add @libsql/client for Turso migration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Turso Database Client Wrapper

**Files:**
- Create: `devops/retail-poller/turso-client.js`

**Implementation:**

Create wrapper module for Turso connection and schema initialization.

```javascript
#!/usr/bin/env node
/**
 * StakTrakr Retail Poller — Turso libSQL Client
 * ==============================================
 * Connects to Turso cloud database via @libsql/client.
 * Replaces better-sqlite3 for remote database operations.
 */

import { createClient } from "@libsql/client";

/**
 * Create and return a Turso client connection.
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars.
 *
 * @returns {import("@libsql/client").Client}
 */
export function createTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set"
    );
  }

  return createClient({ url, authToken });
}

/**
 * Initialize Turso database schema (table + indexes).
 * Idempotent — safe to run multiple times.
 *
 * @param {import("@libsql/client").Client} client
 */
export async function initTursoSchema(client) {
  // Create table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS price_snapshots (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      scraped_at   TEXT NOT NULL,
      window_start TEXT NOT NULL,
      coin_slug    TEXT NOT NULL,
      vendor       TEXT NOT NULL,
      price        REAL,
      source       TEXT NOT NULL,
      confidence   INTEGER,
      is_failed    INTEGER NOT NULL DEFAULT 0,
      in_stock     INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Create indexes
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_coin_window ON price_snapshots(coin_slug, window_start);",
    "CREATE INDEX IF NOT EXISTS idx_window ON price_snapshots(window_start);",
    "CREATE INDEX IF NOT EXISTS idx_coin_date ON price_snapshots(coin_slug, substr(window_start, 1, 10));",
    "CREATE INDEX IF NOT EXISTS idx_coin_vendor_stock ON price_snapshots(coin_slug, vendor, in_stock, scraped_at DESC);",
  ];

  for (const sql of indexes) {
    await client.execute(sql);
  }
}
```

**Verification:**

```bash
cd devops/retail-poller
node -e "import('./turso-client.js').then(m => console.log('Turso client loaded'))"
```

Expected: "Turso client loaded"

**Commit:**

```bash
git add devops/retail-poller/turso-client.js
git commit -m "feat(retail-poller): add Turso client wrapper

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Migrate db.js to Use Turso

**Files:**
- Modify: `devops/retail-poller/db.js`

**Implementation:**

Add Turso support while keeping local SQLite functions for snapshot exports.

**Changes:**

1. Import Turso client at top:
```javascript
import { createTursoClient, initTursoSchema } from "./turso-client.js";
```

2. Add new `openTursoDb()` function:
```javascript
/**
 * Opens Turso cloud database connection.
 * Creates the table and indexes if they don't exist.
 * Replaces local SQLite openDb() function.
 *
 * @returns {Promise<import("@libsql/client").Client>}
 */
export async function openTursoDb() {
  const client = createTursoClient();
  await initTursoSchema(client);
  return client;
}
```

3. Rename existing `openDb()` to `openLocalDb()` and add deprecation comment:
```javascript
/**
 * DEPRECATED: Opens local SQLite database.
 * Kept for generating read-only snapshots from Turso data.
 * Use openTursoDb() for live database operations.
 *
 * @param {string} dataDir  Path to the data/ folder
 * @returns {Database.Database}
 */
export function openLocalDb(dataDir) {
  const dbPath = resolve(join(dataDir, "..", "prices.db"));
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(CREATE_TABLE);
  for (const idx of CREATE_INDEXES) {
    db.exec(idx);
  }
  return db;
}
```

4. Convert `writeSnapshot()` to async for Turso:
```javascript
/**
 * Insert a single price snapshot row into Turso.
 * Now async to support Turso's HTTP protocol.
 */
export async function writeSnapshot(client, row) {
  appendPriceLog(row);

  await client.execute({
    sql: `
      INSERT INTO price_snapshots (
        scraped_at, window_start, coin_slug, vendor, price,
        source, confidence, is_failed, in_stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      row.scrapedAt,
      row.windowStart,
      row.coinSlug,
      row.vendor,
      row.price,
      row.source,
      row.confidence || null,
      row.isFailed ? 1 : 0,
      row.inStock === false ? 0 : 1,
    ],
  });
}
```

5. Convert `readLatestPrices()` to async for Turso:
```javascript
/**
 * Query latest prices for all coins within a 24-hour window.
 * Now async to support Turso HTTP protocol.
 */
export async function readLatestPrices(client, hoursBack = 24) {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const result = await client.execute({
    sql: `
      SELECT
        scraped_at, window_start, coin_slug, vendor, price,
        source, confidence, is_failed, in_stock
      FROM price_snapshots
      WHERE scraped_at >= ?
      ORDER BY scraped_at DESC
    `,
    args: [cutoff],
  });

  return result.rows;
}
```

**Commit:**

```bash
git add devops/retail-poller/db.js
git commit -m "feat(retail-poller): migrate db.js to use Turso

- Add openTursoDb() for cloud database connection
- Rename openDb() to openLocalDb() (deprecated, snapshot-only)
- Convert writeSnapshot() to async
- Convert readLatestPrices() to async

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update price-extract.js for Async Turso

**Files:**
- Modify: `devops/retail-poller/price-extract.js`

**Implementation:**

Convert database operations to async and use Turso client.

**Changes:**

1. Update imports:
```javascript
import { openTursoDb, writeSnapshot, windowFloor } from "./db.js";
```

2. Make `fillGaps()` and `extractAllPrices()` async:
```javascript
async function fillGaps(providersJson, gapVendors, mode) {
  // ... existing code ...
}

async function extractAllPrices() {
  // ... existing code ...
}
```

3. Replace `openDb()` with `await openTursoDb()`:
```javascript
const gapDb = DRY_RUN ? null : await openTursoDb();
// ... later ...
const db = DRY_RUN ? null : await openTursoDb();
```

4. Add `await` to all `writeSnapshot()` calls:
```javascript
await writeSnapshot(db, {
  scrapedAt,
  windowStart,
  coinSlug,
  vendor: vendorId,
  price,
  source,
  confidence,
  isFailed,
  inStock,
});
```

5. Close Turso connections at end:
```javascript
if (db) db.close();
if (gapDb) gapDb.close();
console.log("Done");
```

**Commit:**

```bash
git add devops/retail-poller/price-extract.js
git commit -m "feat(retail-poller): update price-extract.js for async Turso

- Convert extractAllPrices() and fillGaps() to async
- Replace openDb() with await openTursoDb()
- Add await to all writeSnapshot() calls
- Close Turso connections at end

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update extract-vision.js for Async Turso

**Files:**
- Modify: `devops/retail-poller/extract-vision.js`

**Implementation:**

Same pattern as price-extract.js — convert to async Turso.

**Changes:**

1. Update imports:
```javascript
import { openTursoDb, writeSnapshot, windowFloor } from "./db.js";
```

2. Make `main()` async:
```javascript
async function main() {
  // ... existing code ...
}
```

3. Replace `openDb()` with `await openTursoDb()`:
```javascript
const db = DRY_RUN ? null : await openTursoDb();
```

4. Add `await` to all `writeSnapshot()` calls:
```javascript
await writeSnapshot(db, {
  scrapedAt,
  windowStart,
  coinSlug,
  vendor: result.vendor,
  price: result.price,
  source: "vision",
  confidence: result.confidence,
  inStock: result.inStock,
});
```

5. Close Turso connection at end:
```javascript
if (db) db.close();
```

**Commit:**

```bash
git add devops/retail-poller/extract-vision.js
git commit -m "feat(retail-poller): update extract-vision.js for async Turso

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

**(Implementation plan continues with Tasks 6-16, but I'm going to stop here to stay within reasonable message length. The complete plan follows the same pattern for the remaining tasks: api-export.js migration, run-local.sh updates, Docker config, Fly.io setup, merge job script, testing, and documentation.)**

**Hold on deploying to Fly.io until we:**
1. Complete code migration (Tasks 1-8)
2. Test on Mac first (Task 12)
3. Verify Turso writes working
4. Then deploy to Fly.io (Task 13)

Should I continue writing the full plan, or would you like to start implementation now with what we have?
