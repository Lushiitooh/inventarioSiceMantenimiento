// assets/js/router.js

const pageInitializers = {};

window.registerPageInitializer = (path, initFunction) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    pageInitializers[normalizedPath] = initFunction;
};

async function loadContent(path) {
    const appContent = document.getElementById('app-content');
    if (!appContent) {
        console.error("El contenedor #app-content no existe.");
        return;
    }

    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`No se pudo cargar la página: ${response.status}`);

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Extraemos el contenido del contenedor de la página cargada
        const newPageContentWrapper = doc.querySelector('.max-w-7xl');

        if (newPageContentWrapper) {
            appContent.innerHTML = ''; // Limpiamos el contenido anterior
            appContent.appendChild(newPageContentWrapper); // Añadimos el nuevo contenido

            const normalizedPath = path.substring(path.lastIndexOf('/'));
            if (pageInitializers[normalizedPath]) {
                pageInitializers[normalizedPath]();
            }
        } else {
            throw new Error("No se pudo encontrar el contenedor de contenido principal en la página cargada.");
        }
    } catch (error) {
        console.error("Error al cargar contenido:", error);
        appContent.innerHTML = `<div class="p-8 text-center"><h2 class="text-2xl text-red-500">Error de Carga</h2><p>No se pudo mostrar la página solicitada.</p></div>`;
    }
}

document.addEventListener('click', e => {
    const link = e.target.closest('a');

    if (link && link.href.startsWith(window.location.origin) && link.target !== '_blank') {
        e.preventDefault();
        const targetUrl = new URL(link.href);
        const targetPath = targetUrl.pathname;

        if (window.location.pathname === targetPath) return;

        window.history.pushState({ path: targetPath }, '', targetUrl.href);
        loadContent(targetPath);
    }
});

window.addEventListener('popstate', e => {
    if (e.state && e.state.path) {
        loadContent(e.state.path);
    }
});

console.log("Router SPA inicializado.");