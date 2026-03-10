// CF-Clearance-Scraper sidecar client
// =====================================
// Communicates with the ghcr.io/xewdy444/cf-clearance-scraper container.
//
// Verified endpoint (2026-03-09):
//   POST /cf-clearance-tokens
//   Body:    { "url": "https://..." }
//   Returns: { "cf_clearance": "<cookie-value>", "user_agent": "<ua-string>" }
//   Health:  GET / → 200 OK
//
// Source: design.md for STAK-462 (spec-verified schema).
// Live container pull was attempted during implementation but the GHCR registry
// was unavailable from the build machine. Endpoint confirmed via spec design.md
// which documents the upstream API contract. Adapt field mapping if the live
// container returns different field names.

const CF_CLEARANCE_SCRAPER_URL =
  process.env.CF_CLEARANCE_SCRAPER_URL ?? "http://cf-clearance-scraper:5000";
const CF_CLEARANCE_ENABLED = process.env.CF_CLEARANCE_ENABLED ?? "1";
const CF_CLEARANCE_TIMEOUT_MS = process.env.CF_CLEARANCE_TIMEOUT_MS ?? "30000";

/**
 * Harvest a cf_clearance cookie from the sidecar for the given URL.
 *
 * @param {string} url - Vendor product URL to solve CF challenge for
 * @returns {Promise<{ cfClearance: string, userAgent: string } | null>}
 *   Returns cookie+UA on success, null if disabled or sidecar unavailable.
 */
export async function getCFClearanceCookie(url) {
  if (CF_CLEARANCE_ENABLED !== "1") {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Number(CF_CLEARANCE_TIMEOUT_MS)
  );

  try {
    const response = await fetch(
      `${CF_CLEARANCE_SCRAPER_URL}/cf-clearance-tokens`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
    }

    const data = await response.json();
    return {
      cfClearance: data.cf_clearance,
      userAgent: data.user_agent,
    };
  } catch (err) {
    console.warn("[cf-clearance] sidecar error: " + err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
