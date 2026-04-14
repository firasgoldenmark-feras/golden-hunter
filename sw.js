// Golden Hunter Service Worker — v2.2
const CACHE_NAME = 'golden-hunter-v2.2';

const STATIC_ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
      }))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('wa.me')
  ) {
    event.respondWith(fetch(event.request).catch(() => new Response('')));
    return;
  }

  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html') || url.pathname.includes('/golden-hunter')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const net = fetch(event.request).then(r => {
        caches.open(CACHE_NAME).then(c => c.put(event.request, r.clone()));
        return r;
      });
      return cached || net;
    })
  );
});
