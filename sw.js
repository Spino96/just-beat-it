/* Service worker per Beat Yourself.
   Obiettivo: far funzionare l'app anche in palestra con poco segnale,
   servendo l'app shell dalla cache quando manca rete, ma senza mai mostrare
   una versione vecchia dell'HTML quando la rete c'è (network-first per la
   pagina; stale-while-revalidate solo per gli asset statici come le icone). */

const CACHE_NAME = 'beat-yourself-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-32.png',
  './icon-152.png',
  './icon-167.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isPagina = req.mode === 'navigate' || req.url.endsWith('/index.html') || req.url.endsWith('/');

  if (isPagina) {
    // Network-first: se c'è rete, l'utente vede sempre l'ultima versione
    // pubblicata al primo caricamento, non a quello dopo. Se manca rete
    // (es. poco segnale in palestra), si torna alla copia in cache.
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Asset statici (icone, manifest): stale-while-revalidate va benissimo,
  // non serve che siano freschi all'istante.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
