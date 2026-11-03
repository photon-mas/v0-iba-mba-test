/* Photon IBA Test Lab service worker. Bump the version in build.py on every release so installed copies update.
   Only caches whose names start with PREFIX are cleaned up, so other apps on photon-mas.github.io keep theirs. */
const PREFIX = 'photon-iba-';
const VERSION = PREFIX + 'v0.1.2';
const SHELL = ["./", "index.html", "bank.js", "manifest.webmanifest", "favicon-64.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "author.jpg", "author-cover.jpg", "barlow-400.woff2", "barlow-500.woff2", "barlow-600.woff2", "barlow-700.woff2", "barlow-condensed-500.woff2", "barlow-condensed-600.woff2", "barlow-condensed-700.woff2", "newsreader-400-italic.woff2", "newsreader-500.woff2"];
const LAZY = ["vocab.js"];
const DATA = /(bank|vocab)\.js$/;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => caches.open(VERSION))
    .then(c => Promise.all(LAZY.map(u => c.match(u).then(hit => hit || fetch(u).then(r => r.ok && c.put(u, r)).catch(() => {}))))));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    // index: network first, so a new release shows up as soon as the phone is online
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); } return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  if (DATA.test(url.pathname)) {
    // question data: answer from the cache at once, refresh it in the background
    e.respondWith(caches.open(VERSION).then(c => c.match(req, {ignoreSearch: true}).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    })));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});
