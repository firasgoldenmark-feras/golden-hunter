// Golden Hunter Service Worker — v2.1 (2026-04-07)
// تغيير رقم الإصدار يجبر كل الأجهزة على تحديث الكاش تلقائياً
const CACHE_NAME = 'golden-hunter-v2.1';

// الملفات التي تُكَّش
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
];

// ── تثبيت: حذف الكاشات القديمة وتحميل الجديدة
self.addEventListener('install', event => {
  // تفعيل فوري بدون انتظار
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// ── تفعيل: حذف كل الكاشات القديمة
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] حذف كاش قديم:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // تولّي التحكم فوراً
  );
});

// ── الطلبات: Network First لـ HTML، Cache First للباقي
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase و Anthropic و Google Fonts — لا تُكَّش أبداً
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // index.html — Network First (دائماً جلب أحدث نسخة)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html') || url.pathname === '/golden-hunter/') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // حفظ النسخة الجديدة في الكاش
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)) // إذا offline — من الكاش
    );
    return;
  }

  // باقي الملفات — Cache First مع تحديث في الخلفية
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        return response;
      });
      return cached || networkFetch;
    })
  );
});
