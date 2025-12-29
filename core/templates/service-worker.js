const CACHE_NAME = 'felmar-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/static/core/css/styles.css',
    '/static/core/css/results.css',
    '/static/core/css/dashboard.css',
    '/static/core/css/auth.css',
    '/static/core/js/main.js',
    '/static/core/js/results.js',
    '/static/core/js/dashboard.js',
    '/static/core/js/carousel.js',
    '/static/core/img/icon-192.png',
    '/static/core/img/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});