const CACHE_NAME = 'kffc-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/favicon.png',
  '/assets/logo-kffc.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});