// AFRAB Operations — minimal service worker
// No caching, no interception. Exists only so the PWA stays installable.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
// NO fetch handler = the browser talks directly to the network for everything.
