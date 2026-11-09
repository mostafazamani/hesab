/* حساب‌کتاب — Service Worker: اجرای کامل آفلاین */
var CACHE = 'hesabketab-v1';
var ASSETS = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];
var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap';

/* کش کردن فونت وزیرمتن برای استفادهٔ آفلاین (اگر اینترنت نباشد، بی‌صدا رد می‌شود) */
function cacheFonts(cache) {
  return fetch(FONT_CSS).then(function (res) {
    var done = cache.put(FONT_CSS, res.clone());
    return res.text().then(function (css) {
      var urls = css.match(/https:\/\/fonts\.gstatic\.com[^)'" ]+/g) || [];
      return Promise.all(urls.map(function (u) {
        return fetch(u).then(function (r) { return cache.put(u, r) }).catch(function () {});
      })).then(function () { return done });
    });
  }).catch(function () {});
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).then(function () { return cacheFonts(c) });
    }).then(function () { return self.skipWaiting() })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k) }));
    }).then(function () { return self.clients.claim() })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  /* صفحهٔ اصلی: اول شبکه (برای گرفتن به‌روزرسانی‌ها)، در نبود اینترنت از کش */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy) });
        return res;
      }).catch(function () { return caches.match('./index.html') })
    );
    return;
  }
  /* بقیهٔ فایل‌ها (آیکون‌ها، فونت، manifest): اول کش، بعد شبکه */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy) });
        }
        return res;
      }).catch(function () { return Response.error() });
    })
  );
});
