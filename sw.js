// Service worker para instalar el sitio como app (PWA).
// Solo cachea los archivos propios del sitio (la "cáscara" de la app);
// nunca intercepta pedidos a otros orígenes (Firebase, Google Fonts, las
// APIs de cotización del dólar), así que los datos siempre van directo a
// la red y nunca quedan desactualizados por el caché.
//
// Si actualizás el sitio y los cambios no se ven, subí el número de
// CACHE_NAME (por ejemplo a 'cuentas-claras-v2') para forzar a los
// navegadores a descartar el caché viejo.
var CACHE_NAME = 'cuentas-claras-v1';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  if (url.origin !== location.origin) return; // deja pasar todo lo externo sin tocar
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function (response) {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      return response;
    }).catch(function () {
      return caches.match(event.request);
    })
  );
});
