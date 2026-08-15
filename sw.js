const CACHE = 'become-v1';
const ASSETS = [
  './',
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
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
