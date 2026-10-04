// Simple service worker for PWA offline support
const CACHE_NAME = 'ee-moodle-cache-v1';
// Use paths relative to the service worker scope so the SW works when hosted at a sub-path (Vite `base`)
const urlsToCache = [
  './',
  './index.html',
  './ee-logo.jpg',
  './manifest.webmanifest',
  // Add more assets as needed
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Prefer cache.addAll for atomic caching, but fall back to per-file caching
      // so a single missing/404 asset won't cause the install to fail.
      try {
        await cache.addAll(urlsToCache);
      } catch (err) {
        console.warn('cache.addAll failed — caching assets individually', err);
        await Promise.all(
          urlsToCache.map(async (url) => {
            try {
              const res = await fetch(url, { cache: 'no-store' });
              if (res && res.ok) await cache.put(url, res);
              else console.warn('Resource not cached (bad response):', url, res && res.status);
            } catch (e) {
              console.warn('Resource not cached (fetch failed):', url, e);
            }
          })
        );
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});
