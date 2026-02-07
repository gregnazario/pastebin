/**
 * Service Worker for Secure Pastebin PWA
 * Provides offline support, asset caching, and update management.
 *
 * Cache strategy:
 * - Navigation (HTML): Network-first, fallback to cache
 * - Static assets (JS/CSS/images/fonts): Stale-while-revalidate
 * - API requests: Network-only (never cache encrypted data)
 *
 * Versioning: Bump CACHE_VERSION when deploying new versions.
 * Old caches are automatically cleaned up on activation.
 */

const CACHE_VERSION = 2;
const CACHE_NAME = `secure-pastebin-v${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `secure-pastebin-static-v${CACHE_VERSION}`;

/** Maximum age for cached static assets (7 days) */
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Maximum number of entries in the dynamic cache */
const MAX_DYNAMIC_CACHE_ENTRIES = 50;

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/upload',
  '/docs',
  '/manifest.json',
  '/logo.svg',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/llms.txt',
  '/sitemap.xml',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete any cache that doesn't match current version
              return name.startsWith('secure-pastebin-') &&
                     name !== CACHE_NAME &&
                     name !== STATIC_CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Trim a cache to a maximum number of entries (LRU eviction).
 * Removes oldest entries when the cache exceeds maxEntries.
 */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete oldest entries (first in the list)
    const deleteCount = keys.length - maxEntries;
    await Promise.all(
      keys.slice(0, deleteCount).map((key) => cache.delete(key))
    );
  }
}

// Fetch event - network first for HTML, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache paste pages (/p/*) — they contain encrypted data
  if (url.pathname.startsWith('/p/')) {
    return;
  }

  // For navigation requests (HTML pages) - network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return home page as offline fallback
            return caches.match('/');
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts) - stale-while-revalidate
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Always fetch a fresh copy in the background
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
                // Trim cache to prevent unbounded growth
                trimCache(STATIC_CACHE_NAME, MAX_DYNAMIC_CACHE_ENTRIES);
              });
            }
            return response;
          })
          .catch(() => {
            // If fetch fails and we have no cache, return undefined
            return cachedResponse;
          });

        // Return cached version immediately if available, otherwise wait for fetch
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // For other requests - network first, no caching
  event.respondWith(
    fetch(request)
      .then((response) => response)
      .catch(() => caches.match(request))
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
