// PCGS API — Cert Verification
// =============================================================================
// Provides one-click PCGS cert verification via the PCGS Public API.
// Requires a bearer token configured in Settings > API > PCGS.

/**
 * Verify a PCGS certification number via the PCGS Public API.
 *
 * @param {string} certNumber - PCGS certification number to verify
 * @returns {Promise<Object>} Verification result
 * @returns {boolean} result.verified - Whether the cert was found
 * @returns {string}  result.pcgsNumber - PCGS catalog number
 * @returns {string}  result.grade - Full grade string (e.g. "MS-69")
 * @returns {number}  result.population - Total graded at this grade
 * @returns {number}  result.popHigher - Total graded higher
 * @returns {number}  result.priceGuide - PCGS price guide value in USD
 * @returns {string}  result.coinFactsUrl - Direct URL to CoinFacts page
 * @returns {string}  result.error - Error message if verification failed
 */
const verifyPcgsCert = async (certNumber) => {
  // Protocol check — PCGS API requires HTTPS, won't work on file://
  if (window.location.protocol === 'file:') {
    return {
      verified: false,
      error: 'PCGS API requires HTTPS. Cert verification is unavailable on file:// protocol.'
    };
  }

  // Config check
  if (typeof catalogConfig === 'undefined' || !catalogConfig.isPcgsEnabled()) {
    return {
      verified: false,
      error: 'PCGS API not configured. Add your bearer token in Settings > API > PCGS.'
    };
  }

  // Rate limit check
  if (!catalogConfig.canMakePcgsRequest()) {
    return {
      verified: false,
      error: 'PCGS daily rate limit reached (1,000 requests/day). Try again tomorrow.'
    };
  }

  const config = catalogConfig.getPcgsConfig();
  const url = `https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByCertNo/${encodeURIComponent(certNumber)}`;

  try {
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
        return { verified: false, error: 'Invalid or expired PCGS bearer token.' };
      }
      if (response.status === 404) {
        return { verified: false, error: `Cert #${certNumber} not found in PCGS database.` };
      }
      return { verified: false, error: `PCGS API error: HTTP ${response.status}` };
    }

    const data = await response.json();

    // PCGS API returns coin details when found
    if (!data || (!data.PCGSNo && !data.CertNo)) {
      return { verified: false, error: `Cert #${certNumber} not found.` };
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
      year: data.Year || ''
    };
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { verified: false, error: 'Network error — check your internet connection.' };
    }
    return { verified: false, error: error.message || 'Unknown error during PCGS verification.' };
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.verifyPcgsCert = verifyPcgsCert;
}
