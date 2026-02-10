// PCGS API — Cert Verification & Coin Lookup
// =============================================================================
// Provides one-click PCGS cert verification and PCGS# lookup via the PCGS
// Public API. Requires a bearer token configured in Settings > API > PCGS.

/**
 * Shared pre-flight checks for all PCGS API calls.
 * @returns {Object|null} Error result if checks fail, null if OK
 */
const pcgsPreflightCheck = () => {
  if (window.location.protocol === 'file:') {
    return { verified: false, error: 'PCGS API requires HTTPS. Unavailable on file:// protocol.' };
  }
  if (typeof catalogConfig === 'undefined' || !catalogConfig.isPcgsEnabled()) {
    return { verified: false, error: 'PCGS API not configured. Add your bearer token in Settings > API > PCGS.' };
  }
  if (!catalogConfig.canMakePcgsRequest()) {
    return { verified: false, error: 'PCGS daily rate limit reached (1,000 requests/day). Try again tomorrow.' };
  }
  return null;
};

/**
 * Shared fetch wrapper for PCGS API calls.
 * @param {string} url - Full API URL
 * @returns {Promise<Object>} Parsed JSON or error result
 */
const pcgsFetch = async (url) => {
  const config = catalogConfig.getPcgsConfig();
  catalogConfig.incrementPcgsUsage();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `bearer ${config.bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { _error: true, verified: false, error: 'Invalid or expired PCGS bearer token.' };
    }
    if (response.status === 404) {
      return { _error: true, verified: false, error: 'Not found in PCGS database.' };
    }
    return { _error: true, verified: false, error: `PCGS API error: HTTP ${response.status}` };
  }

  return response.json();
};

/**
 * Parse a PCGS API coin detail response into a standardized result object.
 * @param {Object} data - Raw PCGS API response
 * @returns {Object} Parsed coin details
 */
const parsePcgsResponse = (data) => {
  if (!data || (!data.PCGSNo && !data.CertNo)) {
    return { verified: false, error: 'Coin not found in PCGS database.' };
  }

  const gradeNum = data.Grade || '';
  const pcgsNo = String(data.PCGSNo || '');
  const coinFactsUrl = pcgsNo
    ? `https://www.pcgs.com/coinfacts/coin/detail/${pcgsNo}/${gradeNum}`
    : '';

  return {
    verified: true,
    pcgsNumber: pcgsNo,
    grade: data.GradeString || `${data.GradePrefix || ''}${gradeNum}`,
    population: data.Pop || 0,
    popHigher: data.PopHigher || 0,
    priceGuide: data.PriceGuideValue || 0,
    coinFactsUrl,
    name: data.Name || '',
    year: String(data.Year || ''),
    designation: data.Designation || ''
  };
};

/**
 * Verify a PCGS certification number via the PCGS Public API.
 *
 * @param {string} certNumber - PCGS certification number to verify
 * @returns {Promise<Object>} Verification result with coin details
 */
const verifyPcgsCert = async (certNumber) => {
  const check = pcgsPreflightCheck();
  if (check) return check;

  const startTime = Date.now();
  try {
    const url = `https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByCertNo/${encodeURIComponent(certNumber)}`;
    const data = await pcgsFetch(url);
    if (data._error) {
      if (typeof recordCatalogHistory === 'function') {
        recordCatalogHistory({ action: 'pcgs_verify', query: certNumber, result: 'fail', itemCount: 0, provider: 'PCGS', duration: Date.now() - startTime, error: data.error });
      }
      return data;
    }
    const parsed = parsePcgsResponse(data);
    if (typeof recordCatalogHistory === 'function') {
      recordCatalogHistory({ action: 'pcgs_verify', query: certNumber, result: parsed.verified ? 'success' : 'fail', itemCount: parsed.verified ? 1 : 0, provider: 'PCGS', duration: Date.now() - startTime, error: parsed.verified ? null : parsed.error });
    }
    return parsed;
  } catch (error) {
    if (typeof recordCatalogHistory === 'function') {
      recordCatalogHistory({ action: 'pcgs_verify', query: certNumber, result: 'fail', itemCount: 0, provider: 'PCGS', duration: Date.now() - startTime, error: error.message });
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { verified: false, error: 'Network error — check your internet connection.' };
    }
    return { verified: false, error: error.message || 'Unknown error during PCGS verification.' };
  }
};

/**
 * Look up a coin by PCGS catalog number via the PCGS Public API.
 *
 * @param {string} pcgsNumber - PCGS catalog number (e.g. "786060")
 * @param {string} [gradeNumber] - Optional grade number for specific grade lookup
 * @returns {Promise<Object>} Lookup result with coin details
 */
const lookupPcgsByNumber = async (pcgsNumber, gradeNumber) => {
  const check = pcgsPreflightCheck();
  if (check) return check;

  const startTime = Date.now();
  try {
    const grade = gradeNumber || '0';
    const url = `https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByPCGSNo/${encodeURIComponent(pcgsNumber)}/${encodeURIComponent(grade)}`;
    const data = await pcgsFetch(url);
    if (data._error) {
      if (typeof recordCatalogHistory === 'function') {
        recordCatalogHistory({ action: 'pcgs_lookup', query: pcgsNumber, result: 'fail', itemCount: 0, provider: 'PCGS', duration: Date.now() - startTime, error: data.error });
      }
      return data;
    }
    const parsed = parsePcgsResponse(data);
    if (typeof recordCatalogHistory === 'function') {
      recordCatalogHistory({ action: 'pcgs_lookup', query: pcgsNumber, result: parsed.verified ? 'success' : 'fail', itemCount: parsed.verified ? 1 : 0, provider: 'PCGS', duration: Date.now() - startTime, error: parsed.verified ? null : parsed.error });
    }
    return parsed;
  } catch (error) {
    if (typeof recordCatalogHistory === 'function') {
      recordCatalogHistory({ action: 'pcgs_lookup', query: pcgsNumber, result: 'fail', itemCount: 0, provider: 'PCGS', duration: Date.now() - startTime, error: error.message });
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { verified: false, error: 'Network error — check your internet connection.' };
    }
    return { verified: false, error: error.message || 'Unknown error during PCGS lookup.' };
  }
};

/**
 * Smart PCGS lookup — tries Cert# first, then PCGS#.
 * Reads values from the item form fields.
 *
 * @returns {Promise<Object>} Lookup result with coin details
 */
const lookupPcgsFromForm = async () => {
  const certEl = document.getElementById('itemCertNumber');
  const pcgsEl = document.getElementById('itemPcgsNumber');
  const certNumber = (certEl?.value || '').trim();
  const pcgsNumber = (pcgsEl?.value || '').trim();

  if (!certNumber && !pcgsNumber) {
    return { verified: false, error: 'Enter a PCGS Cert# or PCGS# to look up.' };
  }

  // Try cert number first (more specific), then PCGS catalog number
  if (certNumber) {
    const result = await verifyPcgsCert(certNumber);
    if (result.verified) return result;
    // If cert lookup fails and we also have a PCGS#, try that
    if (pcgsNumber) {
      const fallback = await lookupPcgsByNumber(pcgsNumber);
      if (fallback.verified) return fallback;
    }
    return result; // Return the cert error
  }

  return lookupPcgsByNumber(pcgsNumber);
};

// Expose globally
if (typeof window !== 'undefined') {
  window.verifyPcgsCert = verifyPcgsCert;
  window.lookupPcgsByNumber = lookupPcgsByNumber;
  window.lookupPcgsFromForm = lookupPcgsFromForm;
}
