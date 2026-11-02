/* 浮想 · Service Worker
 * 静态壳缓存 + 场景图片按需缓存；没有第三方请求。
 */
const CACHE = 'fuxiang-v12';
const IMAGE_CACHE = 'fuxiang-images-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== IMAGE_CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // 场景图片：第一次用到时缓存，之后离线也能看
  if (url.pathname.indexOf('/images/scenes/') !== -1) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(function (cache) {
        return cache.match(event.request).then(function (cached) {
          if (cached) return cached;
          return fetch(event.request).then(function (response) {
            if (response && response.ok) cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        const copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        return response;
      }).catch(function () {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
