// ============================================================
// AFRAB Ops — Service Worker
// Caches only same-origin static files. Never touches Apps Script
// or Sheets endpoints. Bump CACHE_VERSION whenever you push index.html.
// ============================================================

const CACHE_VERSION = "afrab-v1";   // <-- bump this on every deploy of index.html

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ---------- install: pre-cache app shell ----------
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // addAll fails if any file is missing. Add one by one, ignore errors.
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => { /* ignore missing files */ })
        )
      );
    })
  );
});

// ---------- activate: drop old caches ----------
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// ---------- fetch: cache-first for same-origin static, network-only for the rest ----------
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only GET
  if (req.method !== "GET") return;

  // Only same-origin. This lets script.google.com and docs.google.com pass through.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Ignore URLs with query strings (?v=1 etc.) — always fetch fresh for those
  if (url.search) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req);
    if (cached) {
      // Serve cached, then refresh in background (stale-while-revalidate)
      event.waitUntil(
        fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone());
          }
        }).catch(() => {})
      );
      return cached;
    }
    // Not cached — fetch, cache, return
    try {
      const res = await fetch(req);
      if (res && res.status === 200 && res.type === "basic") {
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      // Offline and not cached — fall back to root index
      const fallback = await cache.match("./index.html");
      if (fallback) return fallback;
      return new Response("Offline", { status: 503 });
    }
  })());
});
