// Service worker: caches the app shell so the quiz keeps working on weak conference Wi-Fi.
// Increase the version on every deploy that changes any file below.
const CACHE = "makom-quiz-v1";
const SHELL = [
  "./", "index.html", "styles.css", "app.js", "content.js", "rules.html",
  "assets/makom-stacked.webp", "assets/makom-horizontal.webp", "assets/jnf-usa.webp",
  "assets/fira-sans-condensed-700-latin.woff2", "assets/favicon-32.png", "assets/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Only same-origin GETs; entry submissions to Google Apps Script are never touched.
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  const path = url.pathname;
  if (path.endsWith("/") || path.endsWith("/index.html") || path.endsWith("/content.js")) {
    e.respondWith(networkFirst(e.request));
  } else {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
  }
});

// Network first with a 3 s timeout, so content edits arrive quickly but a slow network falls back to the cache.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const net = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  const timeout = new Promise(resolve => setTimeout(resolve, 3000));
  const res = await Promise.race([net.catch(() => null), timeout]);
  return res || (await cache.match(req, { ignoreSearch: true })) || net;
}
