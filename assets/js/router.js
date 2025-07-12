// assets/js/router.js (VERSIÓN FINAL Y MÁS SIMPLE)

async function loadContent(path) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Busca el contenedor principal en el HTML cargado
        const newContent = doc.querySelector('#app-content');
        if (newContent) {
            appContent.innerHTML = newContent.innerHTML;

            // Busca y ejecuta los scripts de la nueva página
            Array.from(newContent.querySelectorAll("script")).forEach(oldScript => {
                const newScript = document.createElement("script");
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                document.body.appendChild(newScript).parentNode.removeChild(newScript);
            });
        } else {
             throw new Error("Contenedor #app-content no encontrado en la página de destino.");
        }
    } catch (error) {
        console.error("No se pudo cargar la página: ", error);
        appContent.innerHTML = `<div class="p-8 text-center text-red-500">Error al cargar el contenido.</div>`;
    }
}

document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (link && link.target !== '_blank' && link.href.startsWith(window.location.origin)) {
        e.preventDefault();
        const targetPath = new URL(link.href).pathname;
        if (window.location.pathname !== targetPath) {
            window.history.pushState({ path: targetPath }, '', link.href);
            loadContent(targetPath);
        }
    }
});

window.addEventListener('popstate', e => {
    if (e.state && e.state.path) {
        loadContent(e.state.path);
    }
});

// Carga el contenido de la página inicial
loadContent(window.location.pathname);

console.log("🚀 Router SPA v6 (Simple y efectivo)");