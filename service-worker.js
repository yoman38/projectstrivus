// A new version name is crucial to trigger the update process.
const CACHE_NAME = "strivus-v17.27"; 

const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/record.html',
    '/condition.html',
    '/manifest.json',
    '/exercises.json',
    '/share.html',
    '/icon.svg',
    '/icon-192.png',
    '/icon-512.png',
    '/icon-maskable-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Pre-caching app shell');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// --- ACTIVATE: Clean up old caches ---
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// --- FETCH: Implement a robust Stale-While-Revalidate strategy ---
self.addEventListener('fetch', event => {
    // Ignore non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // **THE KEY FIX**: This condition allows caching of both regular (status: 200)
                    // and cross-origin "opaque" responses (like fonts from fonts.gstatic.com).
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(error => {
                    console.error('[Service Worker] Fetch failed:', error);
                });

                // Return the cached response immediately if available, while the fetch continues in the background.
                return cachedResponse || fetchPromise;
            });
        })
    );
});

// --- BACKGROUND & PERIODIC SYNC (No changes needed) ---
self.addEventListener('sync', event => {
  if (event.tag === 'sync-user-data') {
    console.log('[Service Worker] Background sync triggered for user data.');
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-exercise-data') {
    console.log('[Service Worker] Periodic sync triggered to update exercises.');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return fetch('/exercises.json')
                .then(response => {
                    console.log('[Service Worker] Fetched updated exercises.json');
                    return cache.put('/exercises.json', response);
                });
        })
    );
  }
});