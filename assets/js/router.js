// assets/js/router.js (VERSIÓN FINAL CON EJECUCIÓN DE SCRIPTS)

const basePath = '/inventarioSiceMantenimiento';
const pageInitializers = {};

window.registerPageInitializer = (path, initFunction) => {
    const normalizedPath = path.substring(path.lastIndexOf('/'));
    pageInitializers[normalizedPath] = initFunction;
    console.log(`✅ Página registrada: ${normalizedPath}`);
};

/**
 * @description
 * Esta función busca y ejecuta los scripts de un fragmento de HTML.
 * @param {HTMLElement} contentWrapper - El elemento HTML que contiene el nuevo contenido.
 */
function executeScripts(contentWrapper) {
    // Convertimos la colección de scripts en un array para poder iterarlo.
    const scripts = Array.from(contentWrapper.querySelectorAll("script"));
    scripts.forEach(oldScript => {
        const newScript = document.createElement("script");

        // Copiamos los atributos (como type="module", src, etc.)
        Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });

        // Copiamos el contenido si es un script inline.
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        
        // Añadimos el nuevo script al final del body para que se ejecute.
        document.body.appendChild(newScript);
    });
}

async function loadContent(path) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    const fetchPath = `${basePath}${path}`;
    
    try {
        console.log(`Iniciando carga de: ${fetchPath}`);
        const response = await fetch(fetchPath);
        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
        
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const newPageContentWrapper = doc.querySelector('.max-w-7xl');
        
        if (newPageContentWrapper) {
            appContent.innerHTML = '';
            appContent.appendChild(newPageContentWrapper);
            
            // ¡NUEVO! Ejecutamos los scripts encontrados en el nuevo contenido.
            executeScripts(newPageContentWrapper);
            
            console.log(`Contenido de ${path} cargado.`);
            
            const normalizedPath = path.substring(path.lastIndexOf('/'));
            if (pageInitializers[normalizedPath]) {
                pageInitializers[normalizedPath]();
            }
        } else {
            throw new Error("No se encontró el contenedor '.max-w-7xl'");
        }
    } catch (error) {
        console.error("Error en loadContent:", error);
    }
}

// --- Event Listeners (sin cambios) ---
document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (link && link.href && link.target !== '_blank') {
        e.preventDefault();
        const targetUrl = new URL(link.href);
        let cleanPath = targetUrl.pathname.replace(basePath, '');
        if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;

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

console.log("🚀 Router SPA v5 (con ejecución de scripts)");