const CACHE_NAME = 'focusr-cache-v11-perf-instant';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/three.min.js',
    '/backgrounds/zen-mist.jpg',
    '/backgrounds/deep-forest.jpg',
    '/backgrounds/nordic-aurora.jpg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => console.warn('Cache pre-fetch warning:', err));
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('Purging legacy cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Fast Network-First with 1500ms timeout race for HTML/navigation requests
    if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            Promise.race([
                fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return response;
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('NetworkTimeout')), 1500))
            ]).catch(() => {
                return caches.match(event.request).then((cached) => cached || caches.match('/index.html') || fetch(event.request));
            })
        );
        return;
    }

    // Cache-first with background revalidation for static assets
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            });
        })
    );
});
