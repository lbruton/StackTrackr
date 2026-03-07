#!/usr/bin/env node
/**
 * Generate providers.json from Turso → write to DATA_DIR/retail/providers.json.
 * Called by run-publish.sh before git-adding data/ to the api branch.
 * Non-fatal — if Turso is down, the existing file on the volume is used as-is.
 *
 * @see STAK-348 — Migrate providers.json to Turso DB
 */

import { writeFileSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";
import { createTursoClient } from "./turso-client.js";
import { initProviderSchema, exportProvidersJson } from "./provider-db.js";

const DATA_DIR = resolve(process.env.DATA_DIR || "../../data");
const outPath = join(DATA_DIR, "retail", "providers.json");
const tmpPath = outPath + ".tmp";

try {
  const client = createTursoClient();
  await initProviderSchema(client);
  const json = await exportProvidersJson(client);
  const parsed = JSON.parse(json);
  const coinCount = parsed.coins ? Object.keys(parsed.coins).length : 0;
  writeFileSync(tmpPath, json);
  renameSync(tmpPath, outPath);
  console.log(`[export-providers] Exported ${coinCount} coins to providers.json at ${new Date().toISOString()}`);
} catch (err) {
  console.warn(`[export-providers] Turso unavailable — keeping existing providers.json: ${err.message}`);
}
