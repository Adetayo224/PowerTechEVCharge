// Dynamically generated service worker.
// The cache name is versioned with the Vercel git commit sha so every deploy
// invalidates the previous SW's caches automatically. The SW is served with
// no-cache headers so browsers always fetch a fresh copy and detect updates.

const VERSION =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  "dev";

const CACHE = `plugspot-shell-${VERSION}`;

const SW_BODY = `
// PlugSpot service worker · ${VERSION}
const CACHE = ${JSON.stringify(CACHE)};
const OFFLINE_URL = "/offline";
const CORE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}),
  );
  // Never wait: a new SW becomes active the instant it installs.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Nuke every cache that is not this build's cache.
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    // Take control of already-open tabs so they use the new SW without a reload.
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never intercept API responses, static JS/CSS chunks, images, fonts, or
  // any cross-origin request. Only top-level HTML navigations are handled.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return;
  if (req.destination === "script" || req.destination === "style" || req.destination === "worker") return;
  if (req.destination === "image" || req.destination === "font") return;
  if (req.mode !== "navigate") return;

  // Network first for HTML: always try the fresh version, fall back to the
  // offline shell only when there is no network at all. We do NOT cache the
  // HTML because Next.js RSC responses change per user session.
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: "no-store" });
      return fresh;
    } catch {
      const cached = await caches.match(OFFLINE_URL);
      return cached || Response.error();
    }
  })());
});
`;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return new Response(SW_BODY, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
