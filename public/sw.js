/* Offline shell only.
 *
 * This used to cache every GET, including the hashed JS bundle, with no way to
 * get a newer one in front of a running client. A phone that had the app open
 * kept running the build it first loaded, so shipped fixes appeared not to have
 * shipped. Nothing here is useful offline anyway — every screen reads from
 * Supabase — so the cache now holds the navigation shell and nothing else, and
 * the page reloads itself when a new worker takes over.
 */
const CACHE = 'pepstack-shell-v3';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['/']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Only navigations are cached, and only as a fallback for being offline.
  // Scripts, styles and API calls always go to the network so a deploy is
  // live the moment the page is reloaded.
  if (req.mode !== 'navigate') return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match('/').then((m) => m || Response.error())),
  );
});
