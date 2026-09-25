// sw.js — self-destructing version
// When this file is activated, it unregisters itself and clears all caches.
// After one reload, no service worker will be running.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Delete every cache
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));

    // Unregister this service worker
    await self.registration.unregister();

    // Force every open tab to reload so they lose SW control
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach(client => {
      try { client.navigate(client.url); } catch (e) {}
    });
  })());
});

// NO fetch handler. No caching. This is intentional.
