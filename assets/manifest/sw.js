// assets/manifest/sw.js - Service Worker Corregido para PWA

const CACHE_NAME = 'inventario-epp-cache-v5-fixed';

// Lista de archivos críticos a cachear
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
  '/inventarioSiceMantenimiento/assets/js/pwa-install.js',
  '/inventarioSiceMantenimiento/assets/manifest/manifest.json'
];

// URLs externas importantes
const externalUrls = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js'
];

// Evento 'install': cachea los archivos principales
self.addEventListener('install', event => {
  console.log('[SW] ⚡ Instalando Service Worker v5...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 📦 Cacheando archivos principales...');
        // Cachear archivos principales primero
        return cache.addAll(urlsToCache.slice(0, 5));
      })
      .then(() => {
        console.log('[SW] 📦 Cacheando archivos secundarios...');
        return caches.open(CACHE_NAME).then(cache => {
          // Cachear el resto de archivos sin fallar si alguno no existe
          return Promise.allSettled(
            urlsToCache.slice(5).map(url => 
              cache.add(url).catch(err => {
                console.warn(`[SW] ⚠️ No se pudo cachear ${url}:`, err.message);
                return null;
              })
            )
          );
        });
      })
      .then(() => {
        console.log('[SW] ✅ Archivos principales cacheados correctamente');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] ❌ Error al cachear archivos durante la instalación:', err);
      })
  );
});

// Evento 'activate': limpia cachés antiguos y toma control
self.addEventListener('activate', event => {
  console.log('[SW] 🚀 Activando Service Worker v5...');
  
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    Promise.all([
      // Limpiar cachés antiguos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('[SW] 🗑️ Eliminando caché antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control inmediatamente
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] ✅ Service Worker activado y en control');
      // Notificar a los clientes que el SW está listo
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_READY' });
        });
      });
    })
  );
});

// Evento 'fetch': estrategia de caché mejorada
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
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('pipedream.net') ||
      url.hostname.includes('cloudinary.com') ||
      url.pathname.includes('/api/')) {
    return;
  }

  // Estrategia: Cache First para recursos estáticos, Network First para páginas HTML
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    // Network First para HTML (para obtener actualizaciones)
    event.respondWith(networkFirstStrategy(request));
  } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.json')) {
    // Cache First para recursos estáticos
    event.respondWith(cacheFirstStrategy(request));
  } else if (url.hostname === 'cdn.tailwindcss.com' || url.hostname === 'fonts.googleapis.com') {
    // Cache First para CDNs externos
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Network First para todo lo demás
    event.respondWith(networkFirstStrategy(request));
  }
});

// Estrategia Network First mejorada
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      // Solo cachear respuestas exitosas
      cache.put(request, networkResponse.clone()).catch(err => {
        console.warn('[SW] ⚠️ Error cacheando respuesta:', err.message);
      });
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] 📱 Red no disponible, buscando en caché:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no está en caché y es una página HTML, devolver página offline personalizada
    if (request.destination === 'document' || request.url.includes('.html')) {
      return createOfflinePage();
    }
    
    throw error;
  }
}

// Estrategia Cache First mejorada
async function cacheFirstStrategy(request) {
  // Buscar en caché primero
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Si está en caché, devolverlo inmediatamente
    // Pero también intentar actualizar en segundo plano
    fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {
      // Silenciosamente fallar si no hay red
    });
    
    return cachedResponse;
  }
  
  // Si no está en caché, obtener de la red y cachear
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch(err => {
        console.warn('[SW] ⚠️ Error cacheando:', err.message);
      });
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] ❌ Error al obtener recurso:', request.url, error.message);
    throw error;
  }
}

// Crear página offline personalizada
function createOfflinePage() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Modo Offline - Control EPP</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          padding: 2rem;
          max-width: 400px;
          margin: 1rem;
          text-align: center;
        }
        .icon {
          width: 80px;
          height: 80px;
          background: #fef3c7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          font-size: 2rem;
        }
        h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }
        p {
          color: #6b7280;
          margin-bottom: 2rem;
          line-height: 1.6;
        }
        .btn {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: transform 0.2s ease;
        }
        .btn:hover {
          transform: translateY(-2px);
        }
        .status {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #f3f4f6;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #6b7280;
        }
        .online {
          background: #d1fae5;
          color: #065f46;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📱</div>
        <h1>Modo Offline</h1>
        <p>No hay conexión a internet, pero puedes seguir usando la aplicación con los datos guardados.</p>
        
        <a href="/inventarioSiceMantenimiento/pages/inventario.html?instance=luis" class="btn">
          Ir al Inventario
        </a>
        
        <div class="status" id="status">
          📡 Verificando conexión...
        </div>
      </div>
      
      <script>
        // Detectar cuando vuelve la conexión
        function updateStatus() {
          const status = document.getElementById('status');
          if (navigator.onLine) {
            status.textContent = '✅ Conexión restaurada - Recargando...';
            status.className = 'status online';
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            status.textContent = '📱 Modo offline activo';
            status.className = 'status';
          }
        }
        
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
        
        // Verificar conexión cada 30 segundos
        setInterval(() => {
          if (navigator.onLine) {
            fetch('/inventarioSiceMantenimiento/', { method: 'HEAD' })
              .then(() => {
                updateStatus();
              })
              .catch(() => {
                // Silenciosamente fallar
              });
          }
        }, 30000);
      </script>
    </body>
    </html>
  `, {
    status: 200,
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  });
}

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  console.log('[SW] 📨 Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    // Cachear URLs adicionales bajo demanda
    const urls = event.data.urls || [];
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urls.map(url => cache.add(url).catch(err => {
          console.warn(`[SW] ⚠️ No se pudo cachear ${url}:`, err.message);
        }))
      );
    });
  }
});

// Sincronización en segundo plano
self.addEventListener('sync', event => {
  console.log('[SW] 🔄 Sincronización en segundo plano:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Aquí se puede implementar lógica para sincronizar datos pendientes
    console.log('[SW] 🔄 Realizando sincronización en segundo plano');
    
    // Ejemplo: notificar a los clientes que hay conectividad
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: 'SYNC_COMPLETE',
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('[SW] ❌ Error en sincronización:', error);
  }
}

// Manejar actualizaciones push (para futuro uso)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] 📬 Push recibido:', data);
    
    const options = {
      body: data.body || 'Nueva actualización disponible',
      icon: '/inventarioSiceMantenimiento/assets/icons/icon-192x192.png',
      badge: '/inventarioSiceMantenimiento/assets/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: [
        {
          action: 'open',
          title: 'Abrir App',
          icon: '/inventarioSiceMantenimiento/assets/icons/icon-72x72.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Control EPP', options)
    );
  }
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('[SW] 🔔 Click en notificación:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes('/inventarioSiceMantenimiento/') && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow('/inventarioSiceMantenimiento/');
        }
      })
    );
  }
});

console.log('[SW] ✅ Service Worker v5 registrado correctamente');