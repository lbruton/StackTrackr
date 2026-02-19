#!/usr/bin/env node
/**
 * StakTrakr Retail Price — Confidence Merger
 * ============================================
 * Reads per-coin Firecrawl JSON ({date}.json) and Vision JSON ({date}-vision.json),
 * applies a confidence scoring model, and writes the final merged daily file:
 *   data/retail/{coin-slug}/{date}-final.json
 *
 * Confidence scoring:
 *   - Method agreement (both within 2%): +40 pts → HIGH confidence
 *   - Single method available: base score 50 pts
 *   - Gemini confidence "high": +15, "medium": +5, "low": -10
 *   - Provider agreement (within 3% of median): +10 pts per matching provider
 *   - Day-over-day deviation (>10%): -20 pts warning flag
 *
 * Usage:
 *   node merge-prices.js [date]     # default: today
 *
 * Environment:
 *   DATA_DIR   Path to repo data/ folder (default: ../../data)
 *   DRY_RUN    Set to "1" to skip writing files
 *   COINS      Comma-separated coin slugs (default: all in providers.json)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const DATA_DIR = resolve(process.env.DATA_DIR || join(__dirname, "../../data"));
const DRY_RUN = process.env.DRY_RUN === "1";
const COIN_FILTER = process.env.COINS ? process.env.COINS.split(",").map(s => s.trim()) : null;
const dateStr = process.argv[2] || new Date().toISOString().slice(0, 10);

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
// Confidence scoring
// ---------------------------------------------------------------------------

/**
 * Score a single provider's price using both method results + historical context.
 *
 * @param {object} opts
 * @param {number|null} opts.firecrawlPrice   - Firecrawl text extraction result
 * @param {number|null} opts.visionPrice      - Gemini Vision result
 * @param {string}      opts.visionConfidence - "high"|"medium"|"low"|"none"
 * @param {number|null} opts.prevPrice        - Yesterday's final price (or null)
 * @param {number}      opts.medianPrice      - Today's median across all providers (best estimate)
 * @returns {{ bestPrice: number|null, score: number, method: string, flags: string[] }}
 */
function scorePrice({ firecrawlPrice, visionPrice, visionConfidence, prevPrice, medianPrice }) {
  const flags = [];
  let score = 0;
  let bestPrice = null;
  let method = "none";

  const hasFirecrawl = firecrawlPrice !== null && firecrawlPrice !== undefined;
  const hasVision = visionPrice !== null && visionPrice !== undefined;

  if (!hasFirecrawl && !hasVision) {
    return { bestPrice: null, score: 0, method: "none", flags: ["no_data"] };
  }

  if (hasFirecrawl && hasVision) {
    const diff = Math.abs(firecrawlPrice - visionPrice) / Math.max(firecrawlPrice, visionPrice);
    if (diff <= 0.02) {
      // Both methods agree within 2% — high confidence, use firecrawl (more precise)
      score += 40;
      bestPrice = firecrawlPrice;
      method = "firecrawl+vision";
    } else if (diff <= 0.05) {
      // Close agreement — use lower of the two (less likely to be wrong)
      score += 20;
      bestPrice = Math.min(firecrawlPrice, visionPrice);
      method = "firecrawl+vision(close)";
      flags.push(`method_diff_${(diff * 100).toFixed(1)}pct`);
    } else {
      // Methods disagree — prefer vision for JS-heavy sites, flag for review
      score += 5;
      flags.push(`method_disagree_fc${firecrawlPrice}_v${visionPrice}`);
      // Defer to whichever is closer to median (if available)
      if (medianPrice) {
        const fcDelta = Math.abs(firecrawlPrice - medianPrice);
        const vDelta = Math.abs(visionPrice - medianPrice);
        bestPrice = fcDelta <= vDelta ? firecrawlPrice : visionPrice;
        method = fcDelta <= vDelta ? "firecrawl(median-preferred)" : "vision(median-preferred)";
      } else {
        bestPrice = visionPrice;
        method = "vision(firecrawl-disagrees)";
      }
    }
  } else if (hasFirecrawl) {
    score += 50;
    bestPrice = firecrawlPrice;
    method = "firecrawl";
    flags.push("vision_unavailable");
  } else {
    score += 50;
    bestPrice = visionPrice;
    method = "vision";
    flags.push("firecrawl_unavailable");
  }

  // Gemini confidence modifier
  if (hasVision) {
    if (visionConfidence === "high") score += 15;
    else if (visionConfidence === "medium") score += 5;
    else if (visionConfidence === "low") score -= 10;
  }

  // Provider agreement with median
  if (medianPrice && bestPrice) {
    const deviation = Math.abs(bestPrice - medianPrice) / medianPrice;
    if (deviation <= 0.03) score += 10;
    else if (deviation > 0.08) {
      score -= 15;
      flags.push(`outlier_${(deviation * 100).toFixed(1)}pct_from_median`);
    }
  }

  // Day-over-day check
  if (prevPrice && bestPrice) {
    const dayDiff = Math.abs(bestPrice - prevPrice) / prevPrice;
    if (dayDiff > 0.10) {
      score -= 20;
      flags.push(`day_over_day_${(dayDiff * 100).toFixed(1)}pct`);
    }
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  return { bestPrice, score, method, flags };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJsonSafe(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const providersPath = join(DATA_DIR, "retail", "providers.json");
  if (!existsSync(providersPath)) {
    console.error(`providers.json not found at ${providersPath}`);
    process.exit(1);
  }

  const providersJson = JSON.parse(readFileSync(providersPath, "utf-8"));
  const generatedAt = new Date().toISOString();

  // Yesterday's date for day-over-day comparison
  const yesterday = new Date(dateStr);
  yesterday.setDate(yesterday.getDate() - 1);
  const prevDateStr = yesterday.toISOString().slice(0, 10);

  let totalCoins = 0;
  let totalProviders = 0;
  let highConfidence = 0;

  const coins = COIN_FILTER
    ? Object.entries(providersJson.coins).filter(([slug]) => COIN_FILTER.includes(slug))
    : Object.entries(providersJson.coins);

  log(`Merging prices for ${dateStr} (${coins.length} coins)`);

  for (const [coinSlug, coin] of coins) {
    // Read Firecrawl result
    const fcPath = join(DATA_DIR, "retail", coinSlug, `${dateStr}.json`);
    const fcData = readJsonSafe(fcPath);

    // Read Vision result
    const visionPath = join(DATA_DIR, "retail", coinSlug, `${dateStr}-vision.json`);
    const visionData = readJsonSafe(visionPath);

    if (!fcData && !visionData) {
      warn(`No data for ${coinSlug} on ${dateStr} — skipping`);
      continue;
    }

    // Read yesterday's final for day-over-day
    const prevPath = join(DATA_DIR, "retail", coinSlug, `${prevDateStr}-final.json`);
    const prevData = readJsonSafe(prevPath);
    const prevPrices = prevData?.prices_by_site || {};

    const fcPrices = fcData?.prices_by_site || {};
    const visionPrices = visionData?.prices_by_site || {};
    const visionConf = visionData?.confidence_by_site || {};

    // Get all provider IDs across both sources
    const allProviders = [...new Set([
      ...Object.keys(fcPrices),
      ...Object.keys(visionPrices),
    ])];

    // First pass: get raw best prices for median calculation
    const rawBests = allProviders
      .map(pid => {
        const fc = fcPrices[pid] ?? null;
        const v = visionPrices[pid] ?? null;
        if (fc !== null && v !== null) return Math.min(fc, v);
        return fc ?? v;
      })
      .filter(p => p !== null);

    const todayMedian = median(rawBests);

    // Second pass: score each provider
    const finalPrices = {};
    const scoresBySite = {};
    const methodsBySite = {};
    const flagsBySite = {};

    for (const providerId of allProviders) {
      const result = scorePrice({
        firecrawlPrice: fcPrices[providerId] ?? null,
        visionPrice: visionPrices[providerId] ?? null,
        visionConfidence: visionConf[providerId] || "none",
        prevPrice: prevPrices[providerId] ?? null,
        medianPrice: todayMedian,
      });

      if (result.bestPrice !== null) {
        finalPrices[providerId] = result.bestPrice;
        scoresBySite[providerId] = result.score;
        methodsBySite[providerId] = result.method;
        if (result.flags.length) flagsBySite[providerId] = result.flags;
        if (result.score >= 70) highConfidence++;
      }
      totalProviders++;
    }

    const prices = Object.values(finalPrices);
    const sortedPrices = [...prices].sort((a, b) => a - b);

    const outData = {
      date: dateStr,
      generated_at_utc: generatedAt,
      currency: "USD",
      prices_by_site: finalPrices,
      scores_by_site: scoresBySite,
      methods_by_site: methodsBySite,
      ...(Object.keys(flagsBySite).length ? { flags_by_site: flagsBySite } : {}),
      source_count: prices.length,
      average_price: prices.length
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100
        : null,
      median_price: sortedPrices.length ? sortedPrices[Math.floor(sortedPrices.length / 2)] : null,
      lowest_price: sortedPrices[0] ?? null,
      sources: {
        firecrawl: fcPath ? (fcData ? "ok" : "missing") : "missing",
        vision: visionPath ? (visionData ? "ok" : "missing") : "missing",
      },
    };

    const outPath = join(DATA_DIR, "retail", coinSlug, `${dateStr}-final.json`);
    if (DRY_RUN) {
      log(`[DRY RUN] ${outPath}`);
      console.log(JSON.stringify(outData, null, 2));
    } else {
      mkdirSync(join(DATA_DIR, "retail", coinSlug), { recursive: true });
      writeFileSync(outPath, JSON.stringify(outData, null, 2) + "\n");
      log(`Wrote ${outPath}`);
    }

    totalCoins++;
    log(`  ${coinSlug}: ${prices.length} prices, median $${outData.median_price ?? "n/a"}`);
  }

  log(`Done: ${totalCoins} coins, ${totalProviders} provider slots, ${highConfidence} high-confidence prices`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
