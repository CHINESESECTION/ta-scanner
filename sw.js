/* Service worker for the UG Attendance Scanner PWA.
   Caches the app shell so it launches full-screen (standalone) even offline.
   Firebase reads/writes are always passed through to the network. */
const CACHE = "ug-scan-v1";
const ASSETS = [
  "./scan.html",
  "./scan-manifest.json",
  "./scan-icon-192.png",
  "./scan-icon-512.png",
  "./dao.mp3"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;            // never cache POSTs
  var url = new URL(req.url);
  // Always go to network for Firebase / Google endpoints.
  if (url.hostname.indexOf("firebaseio.com") >= 0 ||
      url.hostname.indexOf("googleapis.com") >= 0) return;

  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        try {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        } catch (err) {}
        return res;
      }).catch(function () {
        // Offline and not cached: serve the app shell if it's a navigation.
        if (req.mode === "navigate") return caches.match("./scan.html");
        return new Response("", { status: 408, statusText: "offline" });
      });
    })
  );
});
