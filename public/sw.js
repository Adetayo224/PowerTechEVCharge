// PlugSpot service worker.
// Kept intentionally minimal:
//   - Does NOT cache script chunks, worker scripts, images, or fonts.
//     Those must always go to the network so no redirected Response can be
//     handed back as a worker/script body (browsers reject that).
//   - Only intercepts top-level navigations to serve the offline shell when
//     the network is completely unreachable.

const CACHE = "plugspot-shell-v4";
const OFFLINE_URL = "/offline";
const CORE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode !== "navigate") return;
  event.respondWith(
    fetch(req).catch(() => caches.match(OFFLINE_URL) || Response.error()),
  );
});
