// StakTrakr Service Worker
// Enables offline support and installable PWA experience
// Cache version is tied to APP_VERSION — old caches are purged on activate

const CACHE_NAME = 'staktrakr-v3.27.05';

// Core shell assets to pre-cache on install
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/file-protocol-fix.js',
  './js/debug-log.js',
  './js/constants.js',
  './js/state.js',
  './js/utils.js',
  './js/image-cache.js',
  './js/fuzzy-search.js',
  './js/autocomplete.js',
  './js/numista-lookup.js',
  './js/versionCheck.js',
  './js/changeLog.js',
  './js/charts.js',
  './js/theme.js',
  './js/search.js',
  './js/chip-grouping.js',
  './js/filters.js',
  './js/sorting.js',
  './js/pagination.js',
  './js/detailsModal.js',
  './js/viewModal.js',
  './js/debugModal.js',
  './js/numista-modal.js',
  './js/spot.js',
  './js/seed-data.js',
  './js/priceHistory.js',
  './js/spotLookup.js',
  './js/goldback.js',
  './js/api.js',
  './js/catalog-api.js',
  './js/pcgs-api.js',
  './js/catalog-providers.js',
  './js/catalog-manager.js',
  './js/inventory.js',
  './js/vault.js',
  './js/about.js',
  './js/customMapping.js',
  './js/settings.js',
  './js/bulkEdit.js',
  './js/events.js',
  './js/init.js',
  './data/spot-history-2025.json',
  './data/spot-history-2026.json',
  './images/safe-favicon.svg',
  './images/staktrakr-logo.svg',
  './images/icon-192.png',
  './images/icon-512.png',
  './manifest.json'
];

// API domains that should use network-first strategy
const API_HOSTS = [
  'api.metalpriceapi.com',
  'metals-api.com',
  'api.gold-api.com',
  'en.numista.com'
];

// CDN domains that use stale-while-revalidate
const CDN_HOSTS = [
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com'
];

// Install: pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: purge old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('staktrakr-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: route requests by strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API calls (spot prices, catalog lookups)
  if (API_HOSTS.some((host) => url.hostname === host)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Stale-while-revalidate for CDN libraries
  if (CDN_HOSTS.some((host) => url.hostname === host)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Cache-first for local assets
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
});

// Shared: fetch and write successful responses to cache
function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  });
}

// Strategy: cache-first with network fallback
function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    return cached || fetchAndCache(request);
  });
}

// Strategy: network-first with cache fallback
function networkFirst(request) {
  return fetchAndCache(request).catch(() => caches.match(request));
}

// Strategy: stale-while-revalidate (serve cached, update in background)
function staleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    return cached || fetchAndCache(request);
  });
}
