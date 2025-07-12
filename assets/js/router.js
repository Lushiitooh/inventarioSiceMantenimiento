// assets/js/router.js (VERSIÓN FINAL Y COMENTADA)

/**
 * @description
 * Este objeto actuará como un registro central. Guardará una referencia a la
 * función principal de cada página (ej. la función que inicia el inventario,
 * la que inicia la página de certificados, etc.).
 */
const pageInitializers = {};

/**
 * @description
 * Hacemos esta función accesible globalmente (a través de window) para que
 * otros archivos (como app.js, certificados.js) puedan registrarse a sí mismos.
 * Cuando app.js se cargue, dirá: "¡Hola, router! Si alguna vez necesitas
 * mostrar la página '/index.html', ejecuta esta función que te paso".
 *
 * @param {string} path - La ruta de la página que se está registrando.
 * @param {Function} initFunction - La función principal que ejecuta la lógica de esa página.
 */
window.registerPageInitializer = (path, initFunction) => {
    // Normalizamos la ruta para evitar problemas con o sin '/' al principio.
    const normalizedPath = path.includes('/') ? path.substring(path.lastIndexOf('/')) : `/${path}`;
    pageInitializers[normalizedPath] = initFunction;
    console.log(`✅ Página registrada en el router: ${normalizedPath}`);
};

/**
 * @description
 * Esta es la función principal que se encarga de cambiar el contenido.
 * Cuando haces clic en un enlace, esta función:
 * 1. Pide el archivo HTML de la nueva página (ej. "pages/certificados.html").
 * 2. Extrae únicamente el contenido que está dentro del contenedor principal.
 * 3. Reemplaza el contenido actual de la página con el nuevo.
 * 4. Llama a la función de inicialización que esa página registró previamente.
 *
 * @param {string} path - La ruta del archivo a cargar (ej. "/pages/certificados.html").
 */
async function loadContent(path) {
    const appContent = document.getElementById('app-content');
    if (!appContent) {
        console.error("CRÍTICO: El contenedor #app-content no se encontró en index.html.");
        return;
    }

    try {
        console.log(`Iniciando carga de: ${path}`);
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status} al intentar cargar ${path}`);
        }
        
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Buscamos el contenido dentro del contenedor de la página que acabamos de cargar.
        // En tu caso, es el div con la clase 'max-w-7xl'.
        const newPageContentWrapper = doc.querySelector('.max-w-7xl');
        
        if (newPageContentWrapper) {
            appContent.innerHTML = ''; // Limpiamos el contenido viejo.
            appContent.appendChild(newPageContentWrapper); // Añadimos el contenido nuevo.
            console.log(`Contenido de ${path} cargado en #app-content.`);

            const normalizedPath = path.substring(path.lastIndexOf('/'));
            if (pageInitializers[normalizedPath]) {
                // Si encontramos una función registrada para esta ruta, la ejecutamos.
                console.log(`Ejecutando inicializador para ${normalizedPath}...`);
                pageInitializers[normalizedPath]();
            } else {
                console.warn(`ADVERTENCIA: No se encontró una función de inicialización para la ruta: ${normalizedPath}`);
            }
        } else {
            throw new Error("No se pudo encontrar el contenedor de contenido principal (div.max-w-7xl) en el archivo de destino.");
        }
    } catch (error) {
        console.error("Error en la función loadContent:", error);
        appContent.innerHTML = `<div class="p-8 text-center text-red-500"><h3>Error de Carga</h3><p>No se pudo mostrar el contenido de la página. Revisa la consola para más detalles.</p></div>`;
    }
}

/**
 * @description
 * Este es el "espía" que vigila todos los clics en la página.
 */
document.addEventListener('click', e => {
    // Buscamos si el clic fue en un enlace <a> o dentro de uno.
    const link = e.target.closest('a');
    
    // Si es un enlace interno y no es para abrir en una nueva pestaña...
    if (link && link.href.startsWith(window.location.origin) && link.target !== '_blank') {
        e.preventDefault(); // ¡Detenemos la recarga de la página!
        const targetUrl = new URL(link.href);
        
        // Solo navegamos si la ruta es diferente a la actual.
        if (window.location.pathname !== targetUrl.pathname) {
            // Actualizamos la URL en la barra del navegador sin recargar.
            window.history.pushState({ path: targetUrl.pathname }, '', targetUrl.href);
            // Llamamos a nuestra función para cargar el nuevo contenido.
            loadContent(targetUrl.pathname);
        }
    }
});

/**
 * @description
 * Este "espía" se activa cuando el usuario usa los botones de "atrás" o "adelante" del navegador.
 */
window.addEventListener('popstate', e => {
    if (e.state && e.state.path) {
        // Carga el contenido de la página a la que el usuario ha vuelto.
        loadContent(e.state.path);
    }
});

console.log("🚀 Router SPA v3 (listo y esperando navegación)");