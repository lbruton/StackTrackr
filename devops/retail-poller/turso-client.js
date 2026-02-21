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
