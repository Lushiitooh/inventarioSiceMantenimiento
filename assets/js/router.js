// assets/js/router.js (VERSIÓN FINAL PARA GITHUB PAGES)

/**
 * @description
 * Esta es la parte más importante para que funcione en GitHub Pages.
 * Define el nombre de tu repositorio. El router lo añadirá al principio
 * de cada ruta que intente cargar.
 */
const basePath = '/inventarioSiceMantenimiento';

const pageInitializers = {};

window.registerPageInitializer = (path, initFunction) => {
    const normalizedPath = path.substring(path.lastIndexOf('/'));
    pageInitializers[normalizedPath] = initFunction;
    console.log(`✅ Página registrada: ${normalizedPath}`);
};

/**
 * @description
 * Función que carga el contenido de las páginas.
 * @param {string} path - La ruta de la página DENTRO del proyecto (ej. "/pages/certificados.html").
 */
async function loadContent(path) {
    const appContent = document.getElementById('app-content');
    if (!appContent) {
        console.error("CRÍTICO: El contenedor #app-content no se encontró.");
        return;
    }

    // CONSTRUIMOS LA RUTA COMPLETA PARA EL FETCH
    const fetchPath = `${basePath}${path}`;
    
    try {
        console.log(`Iniciando carga de: ${fetchPath}`);
        const response = await fetch(fetchPath); // Usamos la ruta completa
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status} al intentar cargar ${fetchPath}`);
        }
        
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const newPageContentWrapper = doc.querySelector('.max-w-7xl');
        
        if (newPageContentWrapper) {
            appContent.innerHTML = '';
            appContent.appendChild(newPageContentWrapper);
            console.log(`Contenido de ${path} cargado.`);

            const normalizedPath = path.substring(path.lastIndexOf('/'));
            if (pageInitializers[normalizedPath]) {
                console.log(`Ejecutando inicializador para ${normalizedPath}...`);
                pageInitializers[normalizedPath]();
            } else {
                console.warn(`ADVERTENCIA: No se encontró inicializador para: ${normalizedPath}`);
            }
        } else {
            throw new Error("No se encontró el contenedor '.max-w-7xl' en el archivo de destino.");
        }
    } catch (error) {
        console.error("Error en loadContent:", error);
        appContent.innerHTML = `<div class="p-8 text-center text-red-500"><h3>Error de Carga</h3><p>No se pudo mostrar el contenido de la página. Revisa la consola para más detalles.</p><p>Ruta intentada: ${fetchPath}</p></div>`;
    }
}

document.addEventListener('click', e => {
    const link = e.target.closest('a');
    
    if (link && link.href && link.target !== '_blank') {
        e.preventDefault();
        const targetUrl = new URL(link.href);
        
        // Extraemos la ruta sin el basePath para mantener la lógica interna limpia
        let cleanPath = targetUrl.pathname.replace(basePath, '');
        if (!cleanPath.startsWith('/')) {
            cleanPath = `/${cleanPath}`;
        }

        if (window.location.pathname.replace(basePath, '') !== cleanPath) {
            window.history.pushState({ path: cleanPath }, '', targetUrl.href);
            loadContent(cleanPath);
        }
    }
});

window.addEventListener('popstate', e => {
    if (e.state && e.state.path) {
        loadContent(e.state.path);
    }
});

console.log("🚀 Router SPA v4 (GitHub Pages Ready)");