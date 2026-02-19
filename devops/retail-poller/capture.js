#!/usr/bin/env node
/**
 * StakTrakr Retail Price Capture
 * ================================
 * Visits dealer product pages via Browserbase (cloud) or local Chromium,
 * takes a screenshot of each, and writes a manifest for downstream
 * extraction (Gemini vision, Jules, etc.).
 *
 * Starter set: 4 coins × 2 providers = 8 screenshots.
 * Expand via COINS / PROVIDERS env vars or by editing providers.json.
 *
 * Usage:
 *   npm run capture            # Browserbase cloud
 *   npm run capture:local      # Local Chromium (needs `npx playwright install chromium`)
 */

import { chromium } from "playwright-core";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "dotenv";

config(); // load .env

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BROWSER_MODE = process.env.BROWSER_MODE || "browserbase";
const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;
const DATA_DIR = resolve(process.env.DATA_DIR || "../../data");

// Starter set — override with COINS=ase,age,... and PROVIDERS=sdbullion,apmex,...
const DEFAULT_COINS = ["ase", "age", "generic-silver-round", "buffalo"];
const DEFAULT_PROVIDERS = ["sdbullion", "apmex"];

const COINS = (process.env.COINS || DEFAULT_COINS.join(",")).split(",").map(s => s.trim());
const PROVIDERS = (process.env.PROVIDERS || DEFAULT_PROVIDERS.join(",")).split(",").map(s => s.trim());

// Per-page delays (ms) — be polite, avoid rate limits
const PAGE_LOAD_WAIT = 4000;    // wait after domcontentloaded for JS rendering
const INTER_PAGE_DELAY = 1500;  // pause between pages

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function loadProviders() {
  const providerPath = join(DATA_DIR, "retail", "providers.json");
  try {
    return JSON.parse(readFileSync(providerPath, "utf-8"));
  } catch (err) {
    console.error(`Failed to read providers.json at ${providerPath}`);
    console.error(err.message);
    process.exit(1);
  }
}

function buildTargetList(providersJson) {
  const targets = [];
  for (const coinSlug of COINS) {
    const coin = providersJson.coins[coinSlug];
    if (!coin) {
      log(`WARN: coin "${coinSlug}" not found in providers.json, skipping`);
      continue;
    }
    for (const provider of coin.providers) {
      if (!PROVIDERS.includes(provider.id)) continue;
      if (!provider.enabled || !provider.url) {
        log(`WARN: ${coinSlug}/${provider.id} disabled or no URL, skipping`);
        continue;
      }
      targets.push({
        coin: coinSlug,
        metal: coin.metal,
        provider: provider.id,
        url: provider.url,
      });
    }
  }
  return targets;
}

// ---------------------------------------------------------------------------
// Browser connection
// ---------------------------------------------------------------------------

async function connectBrowser() {
  if (BROWSER_MODE === "local") {
    log("Launching local Chromium...");
    // Requires: npx playwright install chromium
    const { chromium: localChromium } = await import("playwright");
    return localChromium.launch({ headless: true });
  }

  // Browserbase cloud via CDP
  if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
    console.error("BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID required for cloud mode.");
    console.error("Set BROWSER_MODE=local to use local Chromium instead.");
    process.exit(1);
  }

  log("Creating Browserbase session...");
  const response = await fetch("https://www.browserbase.com/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bb-api-key": BROWSERBASE_API_KEY,
    },
    body: JSON.stringify({ projectId: BROWSERBASE_PROJECT_ID }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Browserbase session creation failed (${response.status}): ${text}`);
    process.exit(1);
  }

  const session = await response.json();
  log(`Browserbase session: ${session.id}`);

  const wsUrl = `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${session.id}`;
  log("Connecting via CDP...");
  return chromium.connectOverCDP(wsUrl);
}

// ---------------------------------------------------------------------------
// Main capture loop
// ---------------------------------------------------------------------------

async function captureAll() {
  const providersJson = loadProviders();
  const targets = buildTargetList(providersJson);

  if (targets.length === 0) {
    console.error("No targets to capture. Check COINS/PROVIDERS env vars.");
    process.exit(1);
  }

  log(`Capturing ${targets.length} pages (${COINS.length} coins × ${PROVIDERS.length} providers)`);

  // Create output directory: data/retail/_artifacts/YYYY-MM-DD/
  const dateStr = today();
  const outDir = join(DATA_DIR, "retail", "_artifacts", dateStr);
  mkdirSync(outDir, { recursive: true });

  const browser = await connectBrowser();
  const context = browser.contexts()[0] || await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const manifest = {
    captured_at: new Date().toISOString(),
    date: dateStr,
    coins: COINS,
    providers: PROVIDERS,
    results: [],
  };

  for (const target of targets) {
    const filename = `${target.coin}_${target.provider}.png`;
    const filepath = join(outDir, filename);

    log(`${target.coin}/${target.provider} → ${target.url}`);

    try {
      const response = await page.goto(target.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const status = response ? response.status() : 0;

      // Wait for JS to render prices
      await page.waitForTimeout(PAGE_LOAD_WAIT);

      // Take full-page screenshot
      await page.screenshot({ path: filepath, fullPage: false });

      const title = await page.title();

      manifest.results.push({
        coin: target.coin,
        provider: target.provider,
        metal: target.metal,
        url: target.url,
        status,
        title,
        screenshot: filename,
        ok: status === 200 && !title.toLowerCase().includes("not found"),
      });

      log(`  ✓ ${status} "${title.slice(0, 60)}" → ${filename}`);
    } catch (err) {
      manifest.results.push({
        coin: target.coin,
        provider: target.provider,
        metal: target.metal,
        url: target.url,
        status: 0,
        title: "",
        screenshot: null,
        ok: false,
        error: err.message.slice(0, 200),
      });
      log(`  ✗ ERROR: ${err.message.slice(0, 100)}`);
    }

    // Polite delay between requests
    await page.waitForTimeout(INTER_PAGE_DELAY);
  }

  // Write manifest
  const manifestPath = join(outDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log(`Manifest written: ${manifestPath}`);

  // Summary
  const ok = manifest.results.filter(r => r.ok).length;
  const fail = manifest.results.filter(r => !r.ok).length;
  log(`Done: ${ok} captured, ${fail} failed out of ${targets.length} targets`);

  await browser.close();
  return manifest;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

captureAll().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
