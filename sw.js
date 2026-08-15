const CACHE = 'become-v12';
const ASSETS = [
  './index.html',
  './habits.html',
  './lifestyle.html',
  './styles.css',
  './js/dates.js',
  './js/storage.js',
  './js/shell.js',
  './js/milestones.js',
  './js/onboarding.js',
  './js/habits.js',
  './js/weight.js',
  './js/calories.js',
  './js/targets.js',
  './js/passages.js',
  './js/fasting.js',
  './js/events.js',
  './js/adaptive.js',
  './js/measurements.js',
  './js/summary.js',
  './js/calendar.js',
  './js/home.js',
  './js/habits-page.js',
  './js/lifestyle-page.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Network-first for CSS/HTML so Pages deploys show up without a hard cache trap
  const url = new URL(req.url);
  const networkFirst =
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.js');

  if (networkFirst) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
