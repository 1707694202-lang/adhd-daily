/* 离线缓存：让网页装到主屏后，没网也能打开（就像真装的软件）
   每次改版本号就能让旧缓存自动失效 */
var CACHE = 'adhd-v35';

var ASSETS = ['./', './index.html', './icon.png', './manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (ch) {
      return ch.addAll(ASSETS).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* 图片 / manifest：优先用缓存（几乎不变） */
  if (/\.(png|webmanifest|json|css|js)$/.test(url.pathname) && !/sw\.js$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(function (c) {
        return c || fetch(req).then(function (r) {
          var copy = r.clone();
          caches.open(CACHE).then(function (ch) { ch.put(req, copy); });
          return r;
        });
      })
    );
    return;
  }

  /* 页面：优先走网络（保证你每次打开都是最新版），断网才用缓存 */
  e.respondWith(
    fetch(req).then(function (r) {
      var copy = r.clone();
      caches.open(CACHE).then(function (ch) { ch.put('./index.html', copy); });
      return r;
    }).catch(function () {
      return caches.match('./index.html').then(function (c) {
        return c || caches.match(req);
      });
    })
  );
});
