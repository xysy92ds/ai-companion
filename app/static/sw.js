// AI Companion - Service Worker for PWA
const CACHE_NAME = "ai-companion-v1";
const STATIC_ASSETS = [
    "/",
    "/static/css/style.css",
    "/static/js/app.js",
    "/static/js/chat.js",
    "/static/js/memory.js",
    "/static/js/terminal.js",
    "/static/js/settings.js",
    "/static/manifest.json",
    "/static/assets/icon-192.png",
    "/static/assets/icon-512.png",
    "/static/assets/ai-avatar.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {});
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Only cache GET requests
    if (event.request.method !== "GET") return;

    // Network-first strategy for API calls
    if (event.request.url.includes("/api/")) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(
                    JSON.stringify({ error: "offline" }),
                    { headers: { "Content-Type": "application/json" } }
                );
            })
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                // Fallback to index for navigation requests
                if (event.request.mode === "navigate") {
                    return caches.match("/");
                }
            });
        })
    );
});
