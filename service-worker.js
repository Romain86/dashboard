const CACHE_NAME = 'dashboard-shell-v1';

const SHELL_ASSETS = [
    '/',
    '/assets/css/tokens.css',
    '/assets/css/header.css',
    '/assets/css/grid.css',
    '/assets/css/card.css',
    '/assets/css/modal.css',
    '/assets/css/drawers.css',
    '/assets/css/fullscreen.css',
    '/assets/css/tabs.css',
    '/assets/css/utilities.css',
    '/assets/js/dashboard.js',
    '/assets/js/modules/utils.js',
    '/assets/js/modules/api.js',
    '/assets/js/modules/clock.js',
    '/assets/js/modules/geolocation.js',
    '/assets/js/modules/header.js',
    '/assets/js/modules/tabs.js',
    '/assets/js/modules/widgets.js',
    '/assets/js/modules/autorefresh.js',
    '/assets/js/modules/dragdrop.js',
    '/assets/js/modules/settings.js',
    '/assets/js/modules/alerts.js',
    '/assets/js/modules/notifications.js',
    '/assets/js/modules/keyboard.js',
    '/assets/js/modules/panels.js',
    '/offline.html',
];

// Install : pré-cache des assets shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate : purge des anciens caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Stratégies de fetch
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // API : network-only, JSON d'erreur si offline
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(JSON.stringify({ success: false, error: 'Hors ligne' }), {
                    headers: { 'Content-Type': 'application/json' },
                })
            )
        );
        return;
    }

    // Widget scripts : network-first avec fallback cache
    if (url.pathname.startsWith('/widgets/') && url.pathname.endsWith('.js')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Google Fonts : cache-first
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // Assets shell : stale-while-revalidate
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cached => {
            const fetchPromise = fetch(event.request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => null);

            return cached || fetchPromise || caches.match('/offline.html');
        })
    );
});
