/* Service worker for «Військова топографія». Cache-first; each course version keeps its own cache,
   so learners pinned to an older version stay offline-capable. Pages ask it to precache via postMessage. */
var PREFIX = 'topo-';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
function cacheFor(url) { var m = /\/(v\d+)\//.exec(url); return PREFIX + (m ? m[1] : 'root'); }
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (/versions\.json$/.test(req.url)) { e.respondWith(fetch(req).catch(function () { return caches.match(req); })); return; }
  e.respondWith(caches.open(cacheFor(req.url)).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
self.addEventListener('message', function (e) {
  var d = e.data || {}, port = e.ports && e.ports[0];
  if (d.type !== 'precache' || !d.urls) return;
  var total = d.urls.length, done = 0, failed = 0;
  d.urls.forEach(function (u) {
    caches.open(cacheFor(u)).then(function (c) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return c.put(u, r); }); })
      .catch(function () { failed++; })
      .then(function () { done++; if (port) port.postMessage({ done: done, total: total, failed: failed }); });
  });
});
