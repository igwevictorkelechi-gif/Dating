/* alignment service worker.
 * Built by vite.config.js, which fills in VERSION and PRECACHE, and served from /sw.js.
 *
 * - Pages (index.html, iphone.html): network first, so updates show straight away; the cached copy is used offline.
 * - Built files in /assets have a content hash in their names: cache first.
 * - Google Fonts: served from cache, refreshed in the background.
 * - Everything else (Supabase API, auth, realtime, uploaded media) goes straight to the network and is never cached.
 */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `alignment-${VERSION}`;
const FONT_CACHE = 'alignment-fonts';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('alignment-') && k !== CACHE && k !== FONT_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // Unknown page while offline: fall back to the app itself.
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') { event.respondWith(networkFirst(request)); return; }
    if (url.pathname.includes('/assets/')) { event.respondWith(cacheFirst(request)); return; }
    if (PRECACHE.some((p) => new URL(p, self.registration.scope).pathname === url.pathname)) {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
  // Anything else (Supabase and uploaded media) is left to the browser.
});
