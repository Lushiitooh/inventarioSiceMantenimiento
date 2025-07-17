// assets/manifest/sw.js (Service Worker corregido)

const CACHE_NAME = 'inventario-epp-cache-v3';

// Lista de archivos a cachear
const urlsToCache = [
  '/',
  '/index.html',
  '/pages/inventario-luis.html',
  '/pages/inventario-alex.html',
  '/pages/inventario-javier.html',
  '/pages/certificados.html',
  '/pages/checklist.html',
  '/pages/formulario-ast.html',
  '/components/navbar.html',
  '/assets/css/styles.css',
  '/assets/js/app.js',
  '/assets/js/certificados.js',
  '/assets/js/checklist.js',
  '/assets/js/formulario-ast.js',
  '/assets/js/navbar.js',
  '/assets/js/router.js',
  '/assets/js/firebase-config.js',
  '/assets/manifest/manifest.json'
];

// URLs externas importantes
const externalUrls = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js'
];

// Evento 'install': cachea los archivos principales
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker v3...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos principales...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Archivos principales cacheados correctamente');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Error al cachear archivos durante la instalación:', err);
      })
  );
});

// Evento 'activate': limpia cachés antiguos y toma control
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker v3...');
  
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    Promise.all([
      // Limpiar cachés antiguos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('[SW] Eliminando caché antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control inmediatamente
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service Worker activado y en control');
    })
  );
});

// Evento 'fetch': estrategia de caché
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar peticiones que no son GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar peticiones a Firebase, APIs externas y webhooks
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase.googleapis.com') ||
      url.hostname.includes('pipedream.net') ||
      url.hostname.includes('cloudinary.com') ||
      url.pathname.includes('/api/')) {
    return;
  }

  // Estrategia: Cache First para recursos estáticos, Network First para páginas HTML
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    // Network First para HTML (para obtener actualizaciones)
    event.respondWith(
      networkFirstStrategy(request)
    );
  } else {
    // Cache First para recursos estáticos (CSS, JS, imágenes)
    event.respondWith(
      cacheFirstStrategy(request)
    );
  }
});

// Estrategia Network First
async function networkFirstStrategy(request) {
  try {
    // Intentar obtener de la red primero
    const networkResponse = await fetch(request);
    
    // Si la respuesta es exitosa, cachearla
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Si falla la red, intentar obtener del caché
    console.log('[SW] Red no disponible, buscando en caché:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no está en caché y es una página HTML, devolver página offline
    if (request.destination === 'document') {
      return new Response(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sin conexión - Control EPP</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-container { max-width: 500px; margin: 0 auto; }
            .offline-icon { font-size: 64px; margin-bottom: 20px; }
            h1 { color: #333; }
            p { color: #666; }
            button { 
              background: #0284c7; color: white; border: none; 
              padding: 10px 20px; border-radius: 5px; cursor: pointer; 
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>Sin conexión a Internet</h1>
            <p>Esta página no está disponible offline. Por favor, verifica tu conexión a internet e intenta nuevamente.</p>
            <button onclick="window.location.reload()">Reintentar</button>
          </div>
        </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// Estrategia Cache First
async function cacheFirstStrategy(request) {
  // Buscar en caché primero
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Si no está en caché, obtener de la red y cachear
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Error al obtener recurso:', request.url, error);
    throw error;
  }
}

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Sincronización en segundo plano (opcional)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Realizando sincronización en segundo plano');
    // Aquí podrías implementar lógica para sincronizar datos pendientes
  }
});

console.log('[SW] Service Worker v3 registrado correctamente');