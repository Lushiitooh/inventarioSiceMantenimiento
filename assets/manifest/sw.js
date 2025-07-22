// assets/manifest/sw.js (Service Worker corregido)

const CACHE_NAME = 'inventario-epp-cache-v4-offline';

// Lista de archivos a cachear
const urlsToCache = [
  '/inventarioSiceMantenimiento/',
  '/inventarioSiceMantenimiento/index.html',
  '/inventarioSiceMantenimiento/pages/inventario.html',
  '/inventarioSiceMantenimiento/pages/certificados.html',
  '/inventarioSiceMantenimiento/pages/checklist.html',
  '/inventarioSiceMantenimiento/pages/formulario-ast.html',
  '/inventarioSiceMantenimiento/pages/personal.html',
  '/inventarioSiceMantenimiento/components/navbar.html',
  '/inventarioSiceMantenimiento/assets/css/styles.css',
  '/inventarioSiceMantenimiento/assets/js/core/epp-manager.js',
  '/inventarioSiceMantenimiento/assets/js/instances/app-luis.js',
  '/inventarioSiceMantenimiento/assets/js/instances/app-alex.js',
  '/inventarioSiceMantenimiento/assets/js/instances/app-javier.js',
  '/inventarioSiceMantenimiento/assets/js/configs/config-luis.js',
  '/inventarioSiceMantenimiento/assets/js/configs/config-alex.js',
  '/inventarioSiceMantenimiento/assets/js/configs/config-javier.js',
  '/inventarioSiceMantenimiento/assets/js/navbar.js',
  '/inventarioSiceMantenimiento/assets/js/router.js',
  '/inventarioSiceMantenimiento/assets/manifest/manifest.json',
  // Firebase CDN (se cachearán cuando se carguen)
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js',
  // Tailwind CSS
  'https://cdn.tailwindcss.com'
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
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Red no disponible, buscando en caché:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no está en caché y es una página HTML, devolver página offline personalizada
    if (request.destination === 'document' || request.url.includes('.html')) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Modo Offline - Control EPP</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
          </style>
        </head>
        <body class="flex items-center justify-center min-h-screen">
          <div class="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">Modo Offline</h1>
            <p class="text-gray-600 mb-6">No hay conexión a internet, pero puedes seguir usando la aplicación.</p>
            <button onclick="window.location.href='/inventarioSiceMantenimiento/pages/inventario.html?instance=luis'" 
                    class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Ir al Inventario (Offline)
            </button>
            <p class="text-xs text-gray-500 mt-4">Tus cambios se sincronizarán cuando vuelva la conexión</p>
          </div>
          
          <script>
            // Detectar cuando vuelve la conexión
            window.addEventListener('online', () => {
              window.location.reload();
            });
          </script>
        </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
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