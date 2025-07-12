// assets/manifest/sw.js (Corregido)

// Nombre del caché para nuestra aplicación
const CACHE_NAME = 'inventario-epp-cache-v2'; // Se incrementa la versión para forzar actualización

// Lista de archivos que queremos cachear (el "app shell")
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
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Evento 'install': se dispara cuando el service worker se instala.
// Aquí es donde cacheamos nuestros archivos.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Abriendo caché y cacheando archivos principales');
        // Usar { cache: 'reload' } para asegurar que obtenemos los archivos frescos de la red durante la instalación.
        const stack = [];
        urlsToCache.forEach(url => stack.push(
            fetch(url, { cache: 'reload' }).then(res => cache.put(url, res))
        ));
        return Promise.all(stack);
      })
      .catch(err => {
        console.error('Service Worker: Fallo al cachear archivos', err);
      })
  );
});

// Evento 'fetch': se dispara cada vez que la aplicación hace una petición de red.
self.addEventListener('fetch', event => {
    // Estrategia: Cache First (buena para el App Shell)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si la respuesta se encuentra en el caché, la retornamos.
                if (response) {
                    return response;
                }
                // Si no está en el caché, hacemos la petición de red.
                return fetch(event.request).then(
                    (response) => {
                        // Opcional: Si quieres cachear nuevas peticiones dinámicamente
                        // if(!response || response.status !== 200 || response.type !== 'basic') {
                        //   return response;
                        // }
                        // const responseToCache = response.clone();
                        // caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                        return response;
                    }
                );
            })
    );
});


// Evento 'activate': se dispara cuando el service worker se activa.
// Aquí limpiamos cachés antiguos.
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
});