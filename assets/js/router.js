// assets/js/router.js (Versión final con sistema de limpieza de eventos)
console.log("🚀 Router SPA v8 (con sistema de limpieza de eventos)");

// Variable global para guardar la función de limpieza de la página actual.
// Esta función será proporcionada por el script de cada página.
let currentPageCleanup = null;

/**
 * Carga el contenido de una nueva página en el contenedor principal #app-content.
 * @param {string} path - La ruta al archivo HTML que se va a cargar.
 */
async function loadContent(path) {
    const appContent = document.getElementById('app-content');
    if (!appContent) {
        console.error("Error crítico: El contenedor #app-content no fue encontrado. El router no puede funcionar.");
        return;
    }

    // 1. Ejecuta la función de limpieza de la página ANTERIOR, si existe.
    // Esto es crucial para eliminar listeners y suscripciones viejas.
    if (typeof currentPageCleanup === 'function') {
        console.log(`🧹 Limpiando los listeners de la página anterior.`);
        currentPageCleanup();
        currentPageCleanup = null; // Resetea la variable para la siguiente página.
    }

    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status} al intentar cargar ${path}`);
        }

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const newContent = doc.querySelector('#app-content');
        if (newContent) {
            appContent.innerHTML = newContent.innerHTML;

            // Busca y ejecuta los scripts de la nueva página para inicializar su lógica.
            // Es importante que los scripts de las páginas sean de tipo "module".
            const scripts = newContent.querySelectorAll("script[type='module']");
            for (const oldScript of scripts) {
                const newScript = document.createElement("script");
                // Copia todos los atributos, incluyendo type="module".
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                // Copia el código fuente para que se ejecute.
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                document.body.appendChild(newScript).parentNode.removeChild(newScript);
            }
        } else {
             throw new Error(`El contenedor #app-content no fue encontrado en la página de destino: ${path}`);
        }
    } catch (error) {
        console.error(`No se pudo cargar la página: ${path}`, error);
        appContent.innerHTML = `<div class="p-8 text-center text-red-500"><h3>Error al cargar el contenido</h3><p>${error.message}</p></div>`;
    }
}

/**
 * API global para que los scripts de las páginas puedan registrar su propia función de limpieza.
 * Esta función será llamada por el router antes de cargar una nueva página.
 * @param {Function} cleanupFunction - La función que contiene la lógica de limpieza (ej. removeEventListener).
 */
window.registerPageCleanup = (cleanupFunction) => {
    currentPageCleanup = cleanupFunction;
};

// --- Manejo de la Navegación ---

// Intercepta los clics en los enlaces para manejar la navegación como una Single Page Application.
document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    // Navega solo si es un enlace local, no abre en nueva pestaña y no tiene el atributo `data-no-route`.
    if (link && link.target !== '_blank' && link.href.startsWith(window.location.origin) && !link.hasAttribute('data-no-route')) {
        e.preventDefault();
        const targetPath = new URL(link.href).pathname;
        // Evita recargar la misma página.
        if (window.location.pathname !== targetPath) {
            window.history.pushState({ path: targetPath }, '', link.href);
            loadContent(targetPath).then(() => {
                // Notifica al navbar para que actualice el enlace activo.
                if (window.NavbarAPI) window.NavbarAPI.refresh();
            });
        }
    }
});

// Maneja los botones de "atrás" y "adelante" del navegador.
window.addEventListener('popstate', e => {
    const path = (e.state && e.state.path) || '/index.html';
    loadContent(path).then(() => {
        if (window.NavbarAPI) window.NavbarAPI.refresh();
    });
});

// Carga el contenido de la página inicial cuando el sitio web se carga por primera vez.
const initialPath = window.location.pathname === '/' ? '/index.html' : window.location.pathname;
loadContent(initialPath);
