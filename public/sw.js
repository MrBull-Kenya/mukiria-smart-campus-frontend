// Keep the app shell available offline; API calls are never cached.
const CACHE = 'mtti-shell-v3';

const offlineResponse = () => new Response(
  'The app is not available offline yet. Reconnect and reload the page.',
  { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
);

const cachedResponse = async (request) => {
  try {
    return await caches.match(request);
  } catch (err) {
    console.warn('SW cache read failed:', err);
    return undefined;
  }
};

const cacheResponse = async (request, response) => {
  if (!response.ok || response.bodyUsed) return;

  try {
    const copy = response.clone();
    const cache = await caches.open(CACHE);
    await cache.put(request, copy);
  } catch (err) {
    console.warn('SW cache update failed:', err);
  }
};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(['/', '/manifest.json']))
      .catch((err) => console.warn('SW shell pre-cache failed:', err))
  );
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
      fetch(req).catch(async () => (await cachedResponse('/')) || offlineResponse())
    );
    return;
  }

  // Static assets (hashed by Vite): stale-while-revalidate.
  const networkResponse = fetch(req);
  e.waitUntil(networkResponse.then((res) => cacheResponse(req, res)).catch(() => {}));
  e.respondWith((async () => {
    const hit = await cachedResponse(req);
    if (hit) return hit;
    try { return await networkResponse; } catch { return offlineResponse(); }
  })().catch((err) => {
    console.error('SW request handling failed:', err);
    return offlineResponse();
  }));
});

// Clicking a desktop alert brings the app to the front (or opens it)
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || '' };
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'MTTI Smart Campus', {
    body: payload.body || 'You have a new campus update.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'campus-update',
    data: { url: payload.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin);
  const path = target.origin === self.location.origin ? `${target.pathname}${target.search}${target.hash}` : '/';

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
    const client = clients.find((candidate) => new URL(candidate.url).origin === self.location.origin);
    if (client) {
      if ('navigate' in client) await client.navigate(path);
      return client.focus();
    }
    return self.clients.openWindow(path);
  }));
});
