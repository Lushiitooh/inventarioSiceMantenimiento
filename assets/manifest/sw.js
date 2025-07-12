// assets/manifest/sw.js (Corregido)

// Se incrementa la versión para forzar la actualización del caché en los navegadores de los usuarios.
const CACHE_NAME = 'inventario-epp-cache-v2';

// Lista de archivos a cachear usando rutas absolutas desde la raíz del sitio.
const urlsToCache = [
  '/',
  '/index.html',
  '/pages/inventario-luis.html',
  '/pages/certificados.html',
  '/pages/checklist.html',
  '/pages/formulario-ast.html',
  '/assets/css/styles.css',
  '/assets/js/app.js',
  '/assets/js/certificados.js',
  '/assets/js/navbar.js',
  '/assets/js/router.js',
  '/assets/js/firebase-config.js',
  '/assets/manifest/manifest.json',
  '/components/navbar.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js'
];

// Evento 'install': Se dispara al instalar el service worker. Cachea los archivos principales.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Abriendo caché y guardando el app shell.');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Service Worker: Fallo al cachear archivos durante la instalación.', err);
      })
  );
  self.skipWaiting();
});

// Evento 'activate': Se activa el service worker y se limpian los cachés antiguos.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activado');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Limpiando caché antiguo', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Evento 'fetch': Intercepta las peticiones de red. Sirve desde el caché si es posible (estrategia Cache First).
self.addEventListener('fetch', event => {
  // Ignoramos las peticiones a Firebase y Pipedream para que siempre vayan a la red.
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('pipedream.net')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si encontramos una respuesta en el caché, la devolvemos.
        if (response) {
          return response;
        }
        
        // Si no, hacemos la petición a la red.
        return fetch(event.request).then(
          (networkResponse) => {
            // Opcional: Si quieres, puedes cachear nuevas peticiones aquí.
            return networkResponse;
          }
        );
      })
  );
});