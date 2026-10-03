// src/public/sw.js
// HelloRun service worker — deliberately conservative.
//
// Installability and offline support are separate concerns. HelloRun pages carry
// session-personalised, fast-changing state (registrations, payment and proof review,
// results, organiser queues), so this worker NEVER caches HTML or API responses and
// NEVER touches non-GET requests. It only:
//   1. serves a static offline page when a page navigation fails, and
//   2. keeps same-origin static assets (CSS, JS, images) warm with stale-while-revalidate.
//
// The version below is replaced per deploy by the `/sw.js` route in src/server.js, so
// every deploy installs a new worker and `activate` deletes the previous caches.
//
// Rollback: to remove the worker from every client, deploy a sw.js whose `install`
// calls skipWaiting(), whose `activate` deletes all caches and calls
// self.registration.unregister(), and which has no fetch handler.

const SW_VERSION = '__HELLORUN_SW_VERSION__';
const CACHE_PREFIX = 'hellorun-';
const STATIC_CACHE = `${CACHE_PREFIX}static-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/images/pwa/icon-192.png',
  '/images/helloRun-icon-browser.png'
];

const STATIC_PATH_PREFIXES = ['/css/', '/js/', '/images/'];

// Large or rarely-needed assets that should not be copied into the cache.
const STATIC_PATH_EXCLUSIONS = ['/js/vendor/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // No skipWaiting() here: a new worker waits until the page asks for it (see the
  // `message` handler), so an open form is never swapped out from under the user.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isCacheableStaticPath(pathname) {
  if (STATIC_PATH_EXCLUSIONS.some((prefix) => pathname.startsWith(prefix))) return false;
  return STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

async function networkWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Writes (registration, payment proof, run proof, reviews, admin actions) always go
  // straight to the network and are never cached or replayed.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin requests (fonts, Lucide, analytics, ads, R2 uploads) are left to the browser.
  if (url.origin !== self.location.origin) return;

  // Page loads: always network. HTML is never cached; failure shows the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(networkWithOfflineFallback(request));
    return;
  }

  if (isCacheableStaticPath(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }

  // Everything else (API calls, JSON endpoints, downloads) falls through to the network.
});
