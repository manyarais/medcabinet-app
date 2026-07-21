/* Pillio service worker — precache shell; network-first APIs + navigations. */
/* eslint-disable no-restricted-globals */

const SHELL_CACHE = "pillio-shell-v1";
const API_CACHE = "pillio-api-v1";
const RUNTIME_CACHE = "pillio-runtime-v1";

const PRECACHE_URLS = [
  "/",
  "/cabinet",
  "/calendar",
  "/symptoms",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-touch-icon.png",
  "/app-icon.png",
];

/** GET APIs that power cabinet / today / calendar offline reads. */
function isOfflineReadableApi(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  if (path === "/api/cabinet") return true;
  if (path === "/api/calendar") return true;
  if (path === "/api/calendar/month") return true;
  return false;
}

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  return (
    path.startsWith("/_next/static/") ||
    path.startsWith("/_next/image") ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|css|js)$/i.test(path)
  );
}

async function notifySync(url) {
  const at = Date.now();
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: "PILLIO_SYNC", at, url });
  }
}

async function networkFirst(request, cacheName, { notify = false } = {}) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      if (notify) await notifySync(request.url);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline-miss");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch {
            // Page may 500 locally without DB — skip.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, API_CACHE, RUNTIME_CACHE]);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("pillio-") && !keep.has(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isOfflineReadableApi(url)) {
    event.respondWith(
      networkFirst(request, API_CACHE, { notify: true }).catch(
        () =>
          new Response(JSON.stringify({ error: "Offline and no cached data." }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirst(request, RUNTIME_CACHE).catch(
        () => new Response("", { status: 503, statusText: "Offline" }),
      ),
    );
    return;
  }

  const isNavigate = request.mode === "navigate";
  const isRsc =
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-State-Tree") != null ||
    url.searchParams.has("_rsc");

  if (isNavigate || isRsc) {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(request, SHELL_CACHE);
        } catch {
          if (isNavigate) {
            const offline = await caches.match("/offline.html");
            if (offline) return offline;
          }
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response("You're offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })(),
    );
  }
});
