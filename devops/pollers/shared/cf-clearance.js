// Byparr sidecar client
// =====================
// Communicates with the ghcr.io/thephaseless/byparr container.
// Byparr uses the FlareSolverr-compatible API (identical schema).
//
// Endpoint:
//   POST /v1
//   Body:    { "cmd": "request.get", "url": "https://...", "maxTimeout": 30000 }
//   Returns: { "status": "ok", "solution": { "cookies": [{ "name": "cf_clearance", "value": "..." }], "userAgent": "..." } }
//   Health:  GET /health → 200 OK
//
// Docs: https://github.com/ThePhaseless/Byparr

const CF_CLEARANCE_SCRAPER_URL =
  process.env.CF_CLEARANCE_SCRAPER_URL ?? "http://byparr:8191";
const CF_CLEARANCE_ENABLED = process.env.CF_CLEARANCE_ENABLED ?? "1";
const CF_CLEARANCE_TIMEOUT_MS = process.env.CF_CLEARANCE_TIMEOUT_MS ?? "30000";

/**
 * Harvest a cf_clearance cookie from the Byparr sidecar for the given URL.
 *
 * @param {string} url - Vendor product URL to solve CF challenge for
 * @returns {Promise<{ cfClearance: string, userAgent: string } | null>}
 *   Returns cookie+UA on success, null if disabled or sidecar unavailable.
 */
export async function getCFClearanceCookie(url) {
  if (CF_CLEARANCE_ENABLED !== "1") {
    return null;
  }

  const timeoutMs = Number(CF_CLEARANCE_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${CF_CLEARANCE_SCRAPER_URL}/v1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "request.get", url, maxTimeout: timeoutMs }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
    }

    const data = await response.json();
    if (data.status !== "ok" || !data.solution) {
      console.warn("[cf-clearance] unexpected response shape:", JSON.stringify(data).slice(0, 200));
      return null;
    }

    const cfCookie = data.solution.cookies?.find((c) => c.name === "cf_clearance");
    if (!cfCookie?.value) {
      console.warn("[cf-clearance] no cf_clearance cookie in solution");
      return null;
    }

    return {
      cfClearance: cfCookie.value,
      userAgent: data.solution.userAgent,
    };
  } catch (err) {
    console.warn("[cf-clearance] sidecar error: " + err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
