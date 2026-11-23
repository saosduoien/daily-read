const VERSION = "daily-read-v1.0.0";
const SHELL = [
  "./",
  "./index.html",
  "./issue.html",
  "./archive.html",
  "./wordbook.html",
  "./studio.html",
  "./css/app.css",
  "./js/config.js",
  "./js/app.js",
  "./js/store.js",
  "./js/github.js",
  "./js/home.js",
  "./js/issue.js",
  "./js/archive.js",
  "./js/wordbook.js",
  "./js/studio.js",
  "./data/issues.json",
  "./manifest.webmanifest",
  "./assets/vendor/marked.umd.js",
  "./assets/vendor/purify.min.js",
  "./assets/fonts/Fraunces-normal-100_900.woff2",
  "./assets/fonts/Fraunces-italic-100_900.woff2",
  "./assets/fonts/Newsreader-normal-200_800.woff2",
  "./assets/fonts/Newsreader-italic-200_800.woff2",
  "./assets/fonts/IBMPlexMono-normal-400.woff2",
  "./assets/fonts/IBMPlexMono-normal-500.woff2",
  "./assets/fonts/IBMPlexMono-normal-600.woff2",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === "api.github.com") {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((cache) => cache.put(req, copy));
        return res;
      }).catch(async () => (await caches.match(req)) || caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (url.origin === location.origin || url.hostname.includes("githubusercontent"))) {
        const copy = res.clone();
        caches.open(VERSION).then((cache) => cache.put(req, copy));
      }
      return res;
    }))
  );
});
