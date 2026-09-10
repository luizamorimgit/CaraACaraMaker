// ==========================================
// SERVICE WORKER - CARA A CARA MAKER v3.0
// SEM CACHE
// ==========================================

const SW_VERSION = "cara-a-cara-v3.0";


// ==========================================
// INSTALAÇÃO
// ==========================================

self.addEventListener("install", (event) => {
    self.skipWaiting();
});


// ==========================================
// ATIVAÇÃO
// ==========================================

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) =>
                        caches.delete(cacheName)
                    )
                );
            })
            .then(() => self.clients.claim())
    );
});


// ==========================================
// REDE SEM CACHE
// ==========================================

self.addEventListener("fetch", (event) => {

    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(event.request, {
            cache: "no-store"
        })
    );
});
