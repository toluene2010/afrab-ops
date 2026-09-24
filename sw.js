// AFRAB Operations — Service Worker
const CACHE_VERSION = "afrab-v3";   // ← bump this number every time you deploy
const CACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Install — cache only local assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CACHE_ASSETS).catch(() => {}))
  );
});

// Activate — delete old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — only handle same-origin GET requests; let everything else hit the network
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only GET
  if (req.method !== "GET") return;

  // Only same-origin (your own domain) — this is the key fix
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // ← lets script.google.com pass through

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          // Cache successful same-origin responses
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
