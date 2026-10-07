// Minimal offline app shell: lets the installed PWA open without a network so the
// IndexedDB offline-scan queue (see src/services/offlineDB.js) can be used in dead zones.
// API calls are never cached: attendance data must always come from the server.
const CACHE = 'mtti-shell-v2';

const offlineResponse = () => new Response(
  'The app is not available offline yet. Reconnect and reload the page.',
  { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.json'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/uploads')) return;

  // Page navigations: network first, fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(async () => (await caches.match('/')) || offlineResponse())
    );
    return;
  }
  // Static assets (hashed by Vite): stale-while-revalidate.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const cachedResponse = res.clone();
            caches.open(CACHE)
              .then((cache) => cache.put(req, cachedResponse))
              .catch((err) => console.warn('SW cache update failed:', err));
          }
          return res;
        })
        .catch(() => hit || offlineResponse());
      return hit || net;
    })
  );
});

// Clicking a desktop alert brings the app to the front (or opens it)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => (all[0] ? all[0].focus() : self.clients.openWindow('/'))));
});
