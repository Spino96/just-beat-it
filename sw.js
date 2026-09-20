/* Service worker per Beat Yourself.
   Obiettivo: far funzionare l'app anche in palestra con poco segnale,
   servendo l'app shell dalla cache quando manca rete, ma senza mai mostrare
   una versione vecchia dell'HTML quando la rete c'è (network-first per la
   pagina; stale-while-revalidate solo per gli asset statici come le icone). */

// NB: quando si aggiunge/rimuove un file da APP_SHELL, o si cambia
// index.html in un modo che l'app deve rivedere offline al prossimo avvio,
// bisogna alzare questo numero di versione: altrimenti l'activate handler
// qui sotto non elimina la cache vecchia e non forza un nuovo precache.
const CACHE_NAME = 'beat-yourself-v5';
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
  './icon-512.png',
  // SDK esterni da cui l'app dipende per avviarsi: senza queste in cache,
  // un primo avvio offline (o prima che la stale-while-revalidate le abbia
  // mai viste) mostrerebbe una pagina bianca invece dell'app shell.
  // Versioni fissate nell'URL: sicure da precachare, non cambiano mai sotto
  // lo stesso link (un cambio di versione nell'HTML richiede comunque di
  // alzare CACHE_NAME qui sopra).
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions-compat.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // cache.addAll() è tutto-o-niente: se anche un solo file fallisce
      // (404, timeout) l'intera app shell resta non cachata senza nessun
      // avviso. Mettiamo in cache ogni file singolarmente così un fallimento
      // isolato non compromette la modalità offline per tutti gli altri.
      Promise.all(APP_SHELL.map(url =>
        cache.add(url).catch(e => console.warn('Precache fallito per', url, e))
      ))
    )
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

  // Asset statici (icone, manifest, gli SDK esterni precachati sopra):
  // stale-while-revalidate va benissimo, non serve che siano freschi
  // all'istante. Le richieste cross-origin NON precaricate (es. immagini
  // degli esercizi da wger.de referenziate dalle schede) vengono servite
  // dalla rete ma mai scritte in cache: altrimenti la cache crescerebbe
  // senza limite ad ogni nuova immagine mai vista prima, senza nessuna
  // policy di eviction.
  const stessaOrigine = new URL(req.url, self.location.href).origin === self.location.origin;
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (stessaOrigine && res && res.status === 200) {
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

/* ============ NOTIFICHE PUSH (promemoria) ============
   Le notifiche inviate da Firebase Cloud Messaging arrivano qui come normali
   eventi "push" del browser: non serve importare l'SDK Firebase nel service
   worker, basta leggere il payload e mostrare la notifica. */
self.addEventListener('push', event => {
  let dati = {};
  try { dati = event.data ? event.data.json() : {}; } catch(e) {}
  const titolo = (dati.notification && dati.notification.title) || 'Beat Yourself';
  const opzioni = {
    body: (dati.notification && dati.notification.body) || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: './index.html' },
    // Se il payload porta un "tag" (es. le notifiche di fine timer di
    // recupero), lo usiamo così una nuova notifica con lo stesso tag
    // sostituisce quella precedente invece di accumularsi.
    tag: (dati.data && dati.data.tag) || undefined
  };
  event.waitUntil(self.registration.showNotification(titolo, opzioni));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(elenco => {
      for (const c of elenco) { if ('focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
