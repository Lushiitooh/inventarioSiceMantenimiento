// assets/js/router.js

/**
 * Carga el contenido de una URL en el contenedor principal '#app-content'.
 * @param {string} href La URL de la página a cargar.
 */
async function loadContent(href) {
    const appContent = document.getElementById('app-content');
    if (!appContent) {
        console.error("El contenedor #app-content no existe.");
        return;
    }

    try {
        const response = await fetch(href);
        if (!response.ok) throw new Error('No se pudo cargar la página.');
        
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Busca el contenido principal en la página cargada
        // Basado en tus archivos, el contenido está dentro de un div con la clase 'max-w-7xl'
        const newContent = doc.querySelector('.max-w-7xl');
        
        if (newContent) {
            appContent.innerHTML = newContent.innerHTML;
            
            // Re-ejecuta los scripts necesarios para la nueva vista
            executePageScripts(doc);
        } else {
            appContent.innerHTML = `<div class="text-center p-8"><h2 class="text-2xl text-red-500">Error</h2><p>No se pudo encontrar el contenido para mostrar en esta página.</p></div>`;
        }

    } catch (error) {
        console.error("Error al cargar contenido:", error);
        appContent.innerHTML = `<div class="text-center p-8"><h2 class="text-2xl text-red-500">Error de Carga</h2><p>No se pudo conectar con la página solicitada.</p></div>`;
    }
}

/**
 * Busca y ejecuta los scripts de la página recién cargada.
 * Los scripts con `type="module"` son especiales y los cargaremos dinámicamente.
 * @param {Document} doc El documento HTML parseado de la página cargada.
 */
function executePageScripts(doc) {
    // Eliminar scripts viejos para evitar duplicados
    document.querySelectorAll('script[data-dynamic-script]').forEach(s => s.remove());

    doc.querySelectorAll('script').forEach(script => {
        const newScript = document.createElement('script');
        
        // Copia los atributos del script original (src, type, etc.)
        script.getAttributeNames().forEach(attr => {
            newScript.setAttribute(attr, script.getAttribute(attr));
        });
        
        newScript.setAttribute('data-dynamic-script', 'true'); // Marca para poder limpiarlo después
        newScript.textContent = script.textContent; // Copia el contenido inline si lo tiene
        
        document.body.appendChild(newScript);
    });
}

// --- Lógica Principal del Router ---

// 1. Interceptar clics en los enlaces de navegación
document.addEventListener('click', e => {
    const link = e.target.closest('a');

    // Si el enlace es interno (misma página) y no abre en una nueva pestaña
    if (link && link.href.startsWith(window.location.origin) && link.target !== '_blank') {
        e.preventDefault(); // Evita la recarga de página

        const targetUrl = link.getAttribute('href');

        // Si la URL es la misma, no hagas nada
        if (window.location.href === targetUrl) return;

        // Actualiza la URL en el navegador sin recargar
        window.history.pushState({ path: targetUrl }, '', targetUrl);
        
        // Carga el nuevo contenido
        loadContent(targetUrl);
    }
});

// 2. Manejar los botones de "atrás" y "adelante" del navegador
window.addEventListener('popstate', e => {
    if (e.state && e.state.path) {
        loadContent(e.state.path);
    }
});

// 3. Cargar el contenido de la página inicial al cargar el sitio por primera vez
document.addEventListener('DOMContentLoaded', () => {
    // Carga el contenido de la página actual (ej. index.html o si se accedió a /pages/certificados.html directamente)
    loadContent(window.location.pathname);
});