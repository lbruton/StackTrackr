# Cloudflare Analytics Integration Plan

## Overview

Integration plan for adding Cloudflare website analytics to StackrTrackr, allowing users to view their website statistics alongside their precious metals tracking data.

**Target Version:** v3.4.0+  
**Complexity:** Medium  
**Dependencies:** Existing API infrastructure (js/api.js)  
**Free Tier Compatible:** ✅ Yes

## Background

StackrTrackr is hosted on Cloudflare Free tier, which provides access to comprehensive analytics APIs. This integration would extend the existing multi-provider API system to include website performance metrics, fitting seamlessly into the current architecture.

## Available Metrics (Cloudflare Free Tier)

### Core Analytics
- **Web Analytics**: Page views, unique visitors, bandwidth usage
- **Security Analytics**: Threats blocked, firewall events  
- **Performance**: Response times, cache hit rates
- **Geographic Data**: Visitor locations by country
- **Top Pages**: Most visited pages
- **Referrer Data**: Traffic sources

### API Endpoints
1. **Zone Analytics** - `/zones/{zone_id}/analytics/dashboard`
2. **Web Analytics** - `/accounts/{account_id}/rum/site_info/{site_id}`  
3. **Security Events** - `/zones/{zone_id}/security/events`

### Free Tier Limitations
- **Rate Limit**: Up to 1,200 requests/day
- **Historical Data**: Usually 30 days maximum
- **Real-time Data**: May have delays
- **Advanced Metrics**: Require paid plans

## Technical Implementation

### 1. API Provider Configuration

Extend `js/constants.js` API_PROVIDERS object:

```javascript
CLOUDFLARE_ANALYTICS: {
  name: "Cloudflare Analytics",
  baseUrl: "https://api.cloudflare.com/client/v4",
  endpoints: {
    dashboard: "/zones/{ZONE_ID}/analytics/dashboard?since={SINCE}&until={UNTIL}",
    webanalytics: "/accounts/{ACCOUNT_ID}/rum/site_info/{SITE_ID}",
    security: "/zones/{ZONE_ID}/security/events?since={SINCE}",
  },
  parseResponse: (data, endpoint) => {
    if (!data.success) return null;
    return data.result;
  },
  documentation: "https://developers.cloudflare.com/analytics/graphql-api/",
  requiresZoneId: true,
  requiresAccountId: true,
},
```

### 2. New Module: `js/cloudflare-analytics.js`

```javascript
/**
 * Cloudflare Analytics Integration
 * Extends the existing API system to include website statistics
 */

// Cache key for Cloudflare analytics data
const CF_ANALYTICS_CACHE_KEY = "cloudflareAnalyticsCache";
const CF_ANALYTICS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Fetches analytics data from Cloudflare API
 * @param {string} endpoint - Analytics endpoint to call
 * @param {Object} config - API configuration
 * @returns {Promise<Object|null>} Analytics data or null
 */
const fetchCloudflareAnalytics = async (endpoint, config) => {
  try {
    const apiKey = config.keys?.CLOUDFLARE_ANALYTICS;
    const zoneId = config.cloudflareZoneId;
    const accountId = config.cloudflareAccountId;
    
    if (!apiKey || !zoneId) {
      console.warn("Cloudflare API key or Zone ID not configured");
      return null;
    }

    // Check cache first
    const cached = getCachedAnalytics(endpoint);
    if (cached) {
      debugLog("Using cached Cloudflare analytics data");
      return cached;
    }

    // Build URL with time parameters (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let url = `${API_PROVIDERS.CLOUDFLARE_ANALYTICS.baseUrl}${endpoint}`;
    url = url.replace('{ZONE_ID}', zoneId);
    url = url.replace('{ACCOUNT_ID}', accountId);
    url = url.replace('{SINCE}', yesterday.toISOString());
    url = url.replace('{UNTIL}', now.toISOString());

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status}`);
    }

    const data = await response.json();
    const parsed = API_PROVIDERS.CLOUDFLARE_ANALYTICS.parseResponse(data, endpoint);
    
    // Cache the result
    setCachedAnalytics(endpoint, parsed);
    
    return parsed;
  } catch (error) {
    console.error("Error fetching Cloudflare analytics:", error);
    return null;
  }
};

/**
 * Gets website statistics for display in the app
 * @returns {Promise<Object>} Website statistics object
 */
const getWebsiteStats = async () => {
  const config = loadApiConfig();
  if (!config || !config.keys?.CLOUDFLARE_ANALYTICS) {
    return null;
  }

  const [dashboard, security] = await Promise.all([
    fetchCloudflareAnalytics(API_PROVIDERS.CLOUDFLARE_ANALYTICS.endpoints.dashboard, config),
    fetchCloudflareAnalytics(API_PROVIDERS.CLOUDFLARE_ANALYTICS.endpoints.security, config),
  ]);

  if (!dashboard) return null;

  return {
    pageviews: dashboard.totals?.pageviews?.all || 0,
    uniqueVisitors: dashboard.totals?.uniques?.all || 0,
    bandwidth: dashboard.totals?.bandwidth?.all || 0,
    threats: security?.length || 0,
    countries: dashboard.totals?.countries || [],
    topPages: dashboard.totals?.requests?.content_type || {},
    cacheRatio: calculateCacheRatio(dashboard),
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Calculates cache hit ratio from dashboard data
 */
const calculateCacheRatio = (dashboard) => {
  const cached = dashboard.totals?.requests?.cached || 0;
  const uncached = dashboard.totals?.requests?.uncached || 0;
  const total = cached + uncached;
  return total > 0 ? Math.round((cached / total) * 100) : 0;
};

/**
 * Cache management functions
 */
const getCachedAnalytics = (endpoint) => {
  try {
    const cached = localStorage.getItem(`${CF_ANALYTICS_CACHE_KEY}_${endpoint}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    if (now - timestamp > CF_ANALYTICS_CACHE_DURATION) {
      localStorage.removeItem(`${CF_ANALYTICS_CACHE_KEY}_${endpoint}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error reading analytics cache:", error);
    return null;
  }
};

const setCachedAnalytics = (endpoint, data) => {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CF_ANALYTICS_CACHE_KEY}_${endpoint}`, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error("Error saving analytics cache:", error);
  }
};

/**
 * Integration helper functions
 */
const toggleWebsiteStats = async () => {
  const config = loadApiConfig();
  const section = document.getElementById('websiteStatsSection');
  
  if (config?.keys?.CLOUDFLARE_ANALYTICS && config?.cloudflareZoneId) {
    section.style.display = 'block';
    await refreshWebsiteStats();
  } else {
    section.style.display = 'none';
    alert('Please configure Cloudflare API credentials first.');
  }
};

const refreshWebsiteStats = async () => {
  const refreshBtn = document.getElementById('refreshStatsBtn');
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Loading...';
  
  try {
    const stats = await getWebsiteStats();
    if (stats) {
      updateStatsDisplay(stats);
    } else {
      alert('Failed to fetch website statistics. Check your API configuration.');
    }
  } catch (error) {
    console.error('Error refreshing stats:', error);
    alert('Error fetching website statistics.');
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh 🔄';
  }
};

const updateStatsDisplay = (stats) => {
  document.getElementById('statPageviews').textContent = formatNumber(stats.pageviews);
  document.getElementById('statVisitors').textContent = formatNumber(stats.uniqueVisitors);
  document.getElementById('statBandwidth').textContent = formatBytes(stats.bandwidth);
  document.getElementById('statThreats').textContent = formatNumber(stats.threats);
  document.getElementById('statCacheRatio').textContent = `${stats.cacheRatio}%`;
  document.getElementById('statLastUpdated').textContent = 
    new Date(stats.lastUpdated).toLocaleTimeString();
};

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const formatBytes = (bytes) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
};
```

### 3. HTML UI Components

Add to `index.html` (after spot prices section):

```html
<!-- Website Statistics Section -->
<div id="websiteStatsSection" style="display: none;">
  <div class="section-header">
    <h2>Website Statistics</h2>
    <button class="btn btn-primary" id="refreshStatsBtn">Refresh 🔄</button>
  </div>
  
  <div class="stats-grid">
    <div class="stat-card">
      <h3>Page Views (24h)</h3>
      <span id="statPageviews" class="stat-value">--</span>
    </div>
    
    <div class="stat-card">
      <h3>Unique Visitors (24h)</h3>
      <span id="statVisitors" class="stat-value">--</span>
    </div>
    
    <div class="stat-card">
      <h3>Bandwidth Used</h3>
      <span id="statBandwidth" class="stat-value">--</span>
    </div>
    
    <div class="stat-card">
      <h3>Threats Blocked</h3>
      <span id="statThreats" class="stat-value">--</span>
    </div>
    
    <div class="stat-card">
      <h3>Cache Hit Rate</h3>
      <span id="statCacheRatio" class="stat-value">--</span>
    </div>
    
    <div class="stat-card">
      <h3>Last Updated</h3>
      <span id="statLastUpdated" class="stat-value">--</span>
    </div>
  </div>
</div>
```

### 4. CSS Styling

Add to `css/styles.css`:

```css
/* Website Statistics */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--spacing-lg);
  text-align: center;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.stat-card h3 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary);
  display: block;
}
```

### 5. Settings Integration

Add to existing settings modal in `index.html`:

```html
<!-- Add this section to existing settings modal -->
<div class="api-provider-config" data-provider="CLOUDFLARE_ANALYTICS">
  <h4>Cloudflare Analytics</h4>
  <div class="form-group">
    <label for="cloudflareApiKey">API Token:</label>
    <input type="password" id="cloudflareApiKey" placeholder="Your Cloudflare API Token">
    <small>Create at: <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank">Cloudflare Dashboard</a></small>
  </div>
  <div class="form-group">
    <label for="cloudflareZoneId">Zone ID:</label>
    <input type="text" id="cloudflareZoneId" placeholder="Your website's Zone ID">
    <small>Found in Cloudflare Dashboard → Your Site → Right sidebar</small>
  </div>
  <div class="form-group">
    <label for="cloudflareAccountId">Account ID (optional):</label>
    <input type="text" id="cloudflareAccountId" placeholder="Your Cloudflare Account ID">
  </div>
  <button class="btn btn-primary" onclick="toggleWebsiteStats()">
    Enable Website Stats
  </button>
</div>
```

## Credential Setup Guide

### API Token (Recommended)
1. Go to [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Custom token" template
4. Set permissions:
   - **Zone: Zone:Read** (for basic zone info)
   - **Zone: Analytics:Read** (for analytics data)
   - **Account: Account:Read** (optional, for account-level analytics)
5. Include your website's zone in "Zone Resources"
6. Copy the generated token

### Zone ID
1. Go to Cloudflare Dashboard
2. Select your website
3. Zone ID is displayed in the right sidebar under "API"

### Account ID (Optional)
1. In Cloudflare Dashboard
2. Account ID is shown in the right sidebar

## Implementation Phases

### Phase 1: Core Integration (v3.4.0)
- [ ] Add Cloudflare provider to API_PROVIDERS
- [ ] Create cloudflare-analytics.js module
- [ ] Basic UI for page views and visitors
- [ ] Settings integration for API configuration
- [ ] Cache management

### Phase 2: Enhanced Metrics (v3.4.1)
- [ ] Security analytics (threats blocked)
- [ ] Cache performance metrics
- [ ] Bandwidth usage tracking
- [ ] Error handling improvements

### Phase 3: Advanced Features (v3.4.2)
- [ ] Geographic breakdown
- [ ] Top pages analytics
- [ ] Historical trending (7/30 day views)
- [ ] Export analytics data

### Phase 4: Dashboard Integration (v3.5.0)
- [ ] Analytics dashboard tab
- [ ] Chart.js integration for trends
- [ ] Comparative analytics
- [ ] Alert thresholds

## Integration Benefits

### For Users
- **Unified Dashboard**: View website performance alongside portfolio tracking
- **Performance Insights**: Understand visitor patterns and site health
- **Security Monitoring**: Track threats and security events
- **Cost Awareness**: Monitor bandwidth usage on free tier

### For Project
- **Extended API System**: Leverages existing multi-provider architecture
- **Minimal Complexity**: Fits seamlessly into current codebase
- **Free Tier Compatible**: Works with Cloudflare's generous free limits
- **Progressive Enhancement**: Can be enabled/disabled per user preference

## Testing Strategy

### Development Testing
1. **API Integration**: Test with real Cloudflare credentials
2. **Cache Behavior**: Verify 30-minute caching works correctly
3. **Error Handling**: Test with invalid credentials/zone IDs
4. **Rate Limiting**: Monitor API usage against 1,200/day limit

### User Testing
1. **Setup Flow**: Ensure credential configuration is clear
2. **Data Display**: Verify metrics are formatted correctly
3. **Refresh Behavior**: Test manual refresh functionality
4. **Mobile Experience**: Check responsive design

## Security Considerations

### API Token Security
- Store tokens encrypted in localStorage (following existing pattern)
- Use minimum required permissions
- Include token rotation guidance in documentation

### Rate Limiting
- Implement client-side rate limiting
- Cache data for 30 minutes to minimize API calls
- Display usage warnings near limits

### Error Handling
- Graceful degradation when API is unavailable
- Clear error messages for configuration issues
- Fallback to cached data when possible

## Future Enhancements

### Advanced Analytics
- **Real-time Updates**: WebSocket integration for live data
- **Custom Dashboards**: User-configurable metrics display
- **Alerting**: Email/push notifications for thresholds
- **A/B Testing**: Integration with Cloudflare Workers

### Multi-Site Support
- Support multiple domains/zones
- Aggregate analytics across properties
- Domain comparison features

### Export Integration
- Include analytics in backup ZIP files
- PDF reports with website statistics
- Scheduled analytics exports

## Dependencies

### Required
- Existing API infrastructure (`js/api.js`)
- Settings modal system
- localStorage caching system
- Chart.js library (already included)

### Optional
- Push notification system (for alerts)
- PDF export system (already available)
- Email service (for reports)

## Estimated Effort

- **Development Time**: 2-3 weeks
- **Testing**: 1 week
- **Documentation**: 3-4 days
- **Total**: ~1 month

## Success Metrics

### Technical
- [ ] API integration working with <30s response time
- [ ] Cache hit rate >90% for repeat requests
- [ ] Zero API rate limit exceeded errors
- [ ] Mobile-responsive UI

### User Experience
- [ ] Setup completion rate >80%
- [ ] Daily active usage >50% of enabled users
- [ ] User feedback rating >4.0/5.0
- [ ] Support tickets <2% of user base

---

**Status**: Planning Phase  
**Priority**: Medium  
**Next Steps**: 
1. Validate Cloudflare API access on free tier
2. Create prototype implementation
3. User feedback on proposed UI
4. Technical architecture review
