self.addEventListener("install", event => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(nomes => {
                return Promise.all(
                    nomes.map(nome => caches.delete(nome))
                );
            })
            .then(() => self.registration.unregister())
            .then(() => self.clients.claim())
    );
});
