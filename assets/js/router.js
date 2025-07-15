// assets/js/router.js (Versión corregida - sin SPA problemático)
console.log("🚀 Router Simple v1.0");

// Manejar la navegación entre páginas de forma tradicional
// En lugar de cargar contenido dinámicamente, redirigimos a las páginas reales

function initializeRouter() {
    // Solo interceptamos clics para añadir transiciones suaves si queremos
    document.addEventListener('click', e => {
        const link = e.target.closest('a[href]');
        
        // Solo procesar enlaces internos que no abran en nueva pestaña
        if (link && 
            link.target !== '_blank' && 
            link.href.startsWith(window.location.origin) && 
            !link.hasAttribute('data-no-route')) {
            
            // Para este proyecto, permitimos la navegación normal
            // Opcional: agregar transición suave
            if (link.getAttribute('href') !== window.location.pathname) {
                document.body.classList.add('transitioning');
            }
        }
    });
}

// Función para actualizar el estado activo del navbar
function updateActiveNavLink() {
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    
    const pageConfig = {
        'index.html': 'home',
        'inventario-luis.html': 'inventario-luis',
        'inventario-alex.html': 'inventario-alex',
        'certificados.html': 'certificados',
        'checklist.html': 'checklist',
        'formulario-ast.html': 'formulario-ast'
    };
    
    const currentPageKey = pageConfig[filename];

    document.querySelectorAll('[data-page]').forEach(link => {
        link.classList.remove('bg-blue-50', 'text-blue-600');
        if (link.dataset.page === currentPageKey) {
            link.classList.add('bg-blue-50', 'text-blue-600');
        }
    });
}

// API global para compatibilidad
window.NavbarAPI = {
    refresh: updateActiveNavLink
};

// API global para compatibilidad con páginas existentes
window.registerPageCleanup = (cleanupFunction) => {
    console.log("registerPageCleanup llamado, pero no necesario en navegación tradicional");
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeRouter();
    updateActiveNavLink();
});

// Actualizar enlace activo cuando se navega con botones del navegador
window.addEventListener('popstate', updateActiveNavLink);